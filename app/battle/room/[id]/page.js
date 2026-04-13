'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../supabase';
import styles from './room.module.css';
import '@livekit/components-styles';

const ROUND_DURATION = 120;
const TOTAL_ROUNDS = 3;

const ROUND_CONFIG = {
  1: { label: 'Round 1', desc: 'Player 1 speaks · Player 2 muted', speaker: 'player1' },
  2: { label: 'Round 2', desc: 'Player 2 speaks · Player 1 muted', speaker: 'player2' },
  3: { label: 'Round 3', desc: 'Open mic — both speak freely', speaker: 'both' },
};

async function updatePlayerStats(winnerUsername, loserUsername, isTie, player1Username, player2Username) {
  try {
    await fetch('/api/update-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ winnerUsername, loserUsername, isTie, player1Username, player2Username }),
    });
  } catch (err) {
    console.error('Failed to update stats:', err);
  }
}

async function sendBattleNotifications(battleId, winnerUsername, player1Username, player2Username, isForfeit = false) {
  const loserUsername = winnerUsername === player1Username ? player2Username : player1Username;
  const notifications = [];
  if (winnerUsername === 'tie') {
    for (const username of [player1Username, player2Username]) {
      const opponent = username === player1Username ? player2Username : player1Username;
      const { data: profile } = await supabase.from('profiles').select('id').eq('username', username).single();
      if (profile?.id) notifications.push({ user_id: profile.id, type: 'battle_result', message: `Your battle against @${opponent} ended in a tie!`, from_username: opponent, read: false });
    }
  } else {
    const { data: winnerProfile } = await supabase.from('profiles').select('id').eq('username', winnerUsername).single();
    if (winnerProfile?.id) notifications.push({ user_id: winnerProfile.id, type: 'battle_result', message: isForfeit ? `🏆 You won your battle against @${loserUsername} (opponent forfeited)` : `🏆 You won your battle against @${loserUsername}!`, from_username: loserUsername, read: false });
    const { data: loserProfile } = await supabase.from('profiles').select('id').eq('username', loserUsername).single();
    if (loserProfile?.id) notifications.push({ user_id: loserProfile.id, type: 'battle_result', message: isForfeit ? `You forfeited your battle against @${winnerUsername}` : `You lost your battle against @${winnerUsername}`, from_username: winnerUsername, read: false });
  }
  if (notifications.length > 0) await supabase.from('notifications').insert(notifications);
}

export default function BattleRoom({ params }) {
  const { id } = use(params);
  const router = useRouter();

  const [battle, setBattle] = useState(null);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [votes, setVotes] = useState({ player1: 0, player2: 0 });
  const [voted, setVoted] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [copied, setCopied] = useState(false);
  const [videoJoined, setVideoJoined] = useState(false);
  const [videoError, setVideoError] = useState('');
  const [currentRound, setCurrentRound] = useState(0);
  const [roundTimeLeft, setRoundTimeLeft] = useState(ROUND_DURATION);
  const [battleEnded, setBattleEnded] = useState(false);
  const [winner, setWinner] = useState(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [remoteTracks, setRemoteTracks] = useState([]);

  const roomRef = useRef(null);
  const localVideoRef = useRef(null);
  const audioElementsRef = useRef({});
  const roundStartTimeRef = useRef(null);
  const roundTimerRef = useRef(null);
  const currentRoundRef = useRef(0);
  const chatBottomRef = useRef(null);
  const profileRef = useRef(null);
  const battleRef = useRef(null);
  const votesRef = useRef({ player1: 0, player2: 0 });
  const statsUpdatedRef = useRef(false);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser); setAuthReady(true);

      if (currentUser) {
        const { data: profileData } = await supabase.from('profiles').select('username, full_name').eq('id', currentUser.id).maybeSingle();
        setProfile(profileData); profileRef.current = profileData;
      }

      const { data: battleData } = await supabase.from('battles').select('*').eq('id', id).single();
      if (!battleData) { router.push('/battle'); return; }
      setBattle(battleData); battleRef.current = battleData;

      if (battleData.status === 'ended' && battleData.winner) {
        setBattleEnded(true); setWinner(battleData.winner); setCurrentRound(TOTAL_ROUNDS);
      }

      const { data: voteData } = await supabase.from('votes').select('side').eq('battle_id', id);
      if (voteData) {
        const v = { player1: voteData.filter(v => v.side === 'player1').length, player2: voteData.filter(v => v.side === 'player2').length };
        setVotes(v); votesRef.current = v;
      }

      if (currentUser) {
        const { data: existingVote } = await supabase.from('votes').select('side').eq('battle_id', id).eq('user_id', currentUser.id).maybeSingle();
        if (existingVote) setVoted(existingVote.side);
      }

      setLoading(false);

      supabase.channel(`votes-${id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'votes', filter: `battle_id=eq.${id}` }, () => loadVotes())
        .subscribe();

      // Both players react to DB update — only Player 1 writes it
      supabase.channel(`battle-status-${id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'battles', filter: `id=eq.${id}` }, (payload) => {
          const updated = payload.new;
          setBattle(updated); battleRef.current = updated;
          if (updated.status === 'ended' && updated.winner) {
            setBattleEnded(true); setWinner(updated.winner); clearInterval(roundTimerRef.current);
          }
        })
        .subscribe();

      // self:true — sender also receives and starts their own timer
      supabase.channel(`round-sync-${id}`, { config: { broadcast: { self: true } } })
        .on('broadcast', { event: 'start-round' }, ({ payload }) => startRound(payload.round))
        .subscribe();

      supabase.channel(`battle-chat-${id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_chats', filter: `game_id=eq.battle-${id}` }, (payload) => {
          const row = payload.new;
          setMessages(prev => [...prev, { name: row.username, text: row.message, isMe: row.user_id === currentUser?.id, time: new Date(row.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) }]);
        })
        .subscribe();

      const { data: existingChats } = await supabase.from('game_chats').select('*').eq('game_id', `battle-${id}`).order('created_at', { ascending: true }).limit(100);
      if (existingChats) setMessages(existingChats.map(row => ({ name: row.username, text: row.message, isMe: row.user_id === currentUser?.id, time: new Date(row.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) })));
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser); setAuthReady(true);
      if (currentUser) {
        const { data: profileData } = await supabase.from('profiles').select('username, full_name').eq('id', currentUser.id).maybeSingle();
        setProfile(profileData); profileRef.current = profileData;
      }
    });

    function handleVisibility() {
      if (document.visibilityState === 'visible' && roundStartTimeRef.current && currentRoundRef.current > 0) {
        const elapsed = Math.floor((Date.now() - roundStartTimeRef.current) / 1000);
        const remaining = Math.max(0, ROUND_DURATION - elapsed);
        setRoundTimeLeft(remaining);
        if (remaining === 0) {
          clearInterval(roundTimerRef.current);
          const next = currentRoundRef.current + 1;
          if (battleRef.current?.player1_username === profileRef.current?.username) {
            if (next > TOTAL_ROUNDS) declareWinner();
            else broadcastRound(next);
          }
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(roundTimerRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
      subscription.unsubscribe();
      if (roomRef.current) { try { roomRef.current.disconnect(); } catch {} roomRef.current = null; }
      Object.values(audioElementsRef.current).forEach(el => el.remove());
    };
  }, [id]);

  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  function attachLocalVideo(track) {
    if (!track?.mediaStreamTrack || !localVideoRef.current) return;
    try {
      localVideoRef.current.srcObject = new MediaStream([track.mediaStreamTrack]);
      localVideoRef.current.style.display = 'block';
    } catch (e) {}
  }

  function broadcastRound(round) {
    supabase.channel(`round-sync-${id}`).send({ type: 'broadcast', event: 'start-round', payload: { round } });
  }

  function startRound(round) {
    clearInterval(roundTimerRef.current);
    currentRoundRef.current = round;
    roundStartTimeRef.current = Date.now();
    setCurrentRound(round); setRoundTimeLeft(ROUND_DURATION);
    enforceMicForRound(round);

    roundTimerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - roundStartTimeRef.current) / 1000);
      const remaining = Math.max(0, ROUND_DURATION - elapsed);
      setRoundTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(roundTimerRef.current);
        const next = currentRoundRef.current + 1;
        // Only Player 1 advances — prevents race condition
        if (battleRef.current?.player1_username === profileRef.current?.username) {
          if (next > TOTAL_ROUNDS) declareWinner();
          else broadcastRound(next);
        }
      }
    }, 1000);
  }

  async function enforceMicForRound(round) {
    if (!roomRef.current) return;
    const isP1 = battleRef.current?.player1_username === profileRef.current?.username;
    const { speaker } = ROUND_CONFIG[round];
    const shouldHaveMic = speaker === 'both' || (speaker === 'player1' && isP1) || (speaker === 'player2' && !isP1);
    try { await roomRef.current.localParticipant.setMicrophoneEnabled(shouldHaveMic); setIsMicOn(shouldHaveMic); } catch {}
  }

  async function declareWinner() {
    const v = votesRef.current; const b = battleRef.current;
    if (!b || b.status === 'ended' || statsUpdatedRef.current) return;
    statsUpdatedRef.current = true;
    const winnerUsername = v.player1 > v.player2 ? b.player1_username : v.player2 > v.player1 ? b.player2_username : 'tie';
    const loserUsername = winnerUsername === b.player1_username ? b.player2_username : b.player1_username;
    await supabase.from('battles').update({ status: 'ended', winner: winnerUsername, ended_at: new Date().toISOString() }).eq('id', id);
    await Promise.all([
      sendBattleNotifications(id, winnerUsername, b.player1_username, b.player2_username, false),
      updatePlayerStats(winnerUsername, loserUsername, winnerUsername === 'tie', b.player1_username, b.player2_username),
    ]);
  }

  async function declareWinnerByForfeit(leavingUsername) {
    const b = battleRef.current;
    if (!b || b.status === 'ended' || statsUpdatedRef.current) return;
    statsUpdatedRef.current = true;
    const winnerUsername = b.player1_username === leavingUsername ? b.player2_username : b.player1_username;
    await supabase.from('battles').update({ status: 'ended', winner: winnerUsername, ended_at: new Date().toISOString() }).eq('id', id);
    await Promise.all([
      sendBattleNotifications(id, winnerUsername, b.player1_username, b.player2_username, true),
      updatePlayerStats(winnerUsername, leavingUsername, false, b.player1_username, b.player2_username),
    ]);
  }

  async function loadVotes() {
    const { data } = await supabase.from('votes').select('side').eq('battle_id', id);
    if (data) {
      const v = { player1: data.filter(v => v.side === 'player1').length, player2: data.filter(v => v.side === 'player2').length };
      setVotes(v); votesRef.current = v;
    }
  }

  async function castVote(side) {
    if (voted || !user) return;
    setVoted(side);
    setVotes(v => ({ ...v, [side]: v[side] + 1 }));
    votesRef.current = { ...votesRef.current, [side]: votesRef.current[side] + 1 };
    const { error } = await supabase.from('votes').insert({ battle_id: id, user_id: user.id, side });
    if (error) {
      setVoted(null);
      setVotes(v => ({ ...v, [side]: v[side] - 1 }));
      votesRef.current = { ...votesRef.current, [side]: votesRef.current[side] - 1 };
    }
  }

  async function joinVideo() {
    const battleData = battleRef.current; const profileData = profileRef.current;
    if (!battleData?.room_name) { setVideoError('Room not ready. Please try again.'); return; }
    if (battleData.status === 'ended') { setVideoError('This battle has ended.'); return; }
    setVideoError('');
    try {
      const { Room, RoomEvent, Track } = await import('livekit-client');
      const isDebater = profileData && (battleData.player1_username === profileData.username || battleData.player2_username === profileData.username);
      const tokenRes = await fetch('/api/livekit-token', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName: battleData.room_name, participantName: profileData?.username || `viewer-${Date.now()}`, canPublish: isDebater }),
      });
      const { token, error: tokenError } = await tokenRes.json();
      if (tokenError) throw new Error(tokenError);

      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (track.kind === Track.Kind.Video) setRemoteTracks(prev => [...prev, { track, participant }]);
        if (track.kind === Track.Kind.Audio) {
          const audioEl = document.createElement('audio');
          audioEl.autoplay = true; audioEl.srcObject = new MediaStream([track.mediaStreamTrack]);
          audioEl.play().catch(() => {});
          audioElementsRef.current[track.sid] = audioEl; document.body.appendChild(audioEl);
        }
      });
      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        if (track.kind === Track.Kind.Video) setRemoteTracks(prev => prev.filter(t => t.track !== track));
        if (track.kind === Track.Kind.Audio && audioElementsRef.current[track.sid]) {
          audioElementsRef.current[track.sid].remove(); delete audioElementsRef.current[track.sid];
        }
      });
      room.on(RoomEvent.Disconnected, () => {
        setVideoJoined(false); setRemoteTracks([]);
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
        Object.values(audioElementsRef.current).forEach(el => el.remove()); audioElementsRef.current = {};
        clearInterval(roundTimerRef.current);
      });
      room.on(RoomEvent.LocalTrackPublished, (publication) => {
        if (publication.source === Track.Source.Camera) attachLocalVideo(publication.track);
      });
      room.on(RoomEvent.ParticipantDisconnected, (participant) => {
        const b = battleRef.current;
        if (!b || b.status === 'ended') return;
        if ((participant.identity === b.player1_username || participant.identity === b.player2_username) && currentRoundRef.current > 0)
          declareWinnerByForfeit(participant.identity);
      });

      await room.connect('wss://torchd-kub6j4c8.livekit.cloud', token);

      if (isDebater) {
        await room.localParticipant.setCameraEnabled(true);
        await room.localParticipant.setMicrophoneEnabled(true);
        const tryAttach = () => { const camPub = room.localParticipant.getTrackPublication(Track.Source.Camera); if (camPub?.track) attachLocalVideo(camPub.track); };
        tryAttach(); setTimeout(tryAttach, 500); setTimeout(tryAttach, 1500); setTimeout(tryAttach, 3000);
      }
      setVideoJoined(true);
    } catch (err) { setVideoError('Could not join: ' + err.message); }
  }

  async function leaveVideo() {
    const profileData = profileRef.current; const battleData = battleRef.current;
    if (profileData && battleData && battleData.status !== 'ended' && currentRoundRef.current > 0) {
      const isDebater = battleData.player1_username === profileData.username || battleData.player2_username === profileData.username;
      if (isDebater) await declareWinnerByForfeit(profileData.username);
    }
    clearInterval(roundTimerRef.current);
    if (roomRef.current) { try { await roomRef.current.disconnect(); } catch {} roomRef.current = null; }
    setVideoJoined(false); setRemoteTracks([]);
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    Object.values(audioElementsRef.current).forEach(el => el.remove()); audioElementsRef.current = {};
    router.push('/battle');
  }

  async function toggleMic() {
    if (!roomRef.current) return;
    // Block when locked out for this round
    if (currentRoundRef.current > 0 && !battleEnded) {
      const isP1 = battleRef.current?.player1_username === profileRef.current?.username;
      const { speaker } = ROUND_CONFIG[currentRoundRef.current];
      if ((speaker === 'player1' && !isP1) || (speaker === 'player2' && isP1)) return;
    }
    const enabled = !isMicOn;
    await roomRef.current.localParticipant.setMicrophoneEnabled(enabled);
    setIsMicOn(enabled);
  }

  async function toggleCam() {
    if (!roomRef.current) return;
    const enabled = !isCamOn;
    await roomRef.current.localParticipant.setCameraEnabled(enabled);
    setIsCamOn(enabled);
    if (enabled) {
      // Reattach local preview after re-enabling
      const { Track } = await import('livekit-client');
      const tryReattach = () => {
        const camPub = roomRef.current?.localParticipant?.getTrackPublication(Track.Source.Camera);
        if (camPub?.track?.mediaStreamTrack && localVideoRef.current) {
          localVideoRef.current.srcObject = new MediaStream([camPub.track.mediaStreamTrack]);
          localVideoRef.current.style.display = 'block';
        }
      };
      setTimeout(tryReattach, 300); setTimeout(tryReattach, 800); setTimeout(tryReattach, 1500);
    } else {
      if (localVideoRef.current) { localVideoRef.current.style.display = 'none'; localVideoRef.current.srcObject = null; }
    }
  }

  function handleStartBattle() {
    if (!battleRef.current?.player2_username) return;
    broadcastRound(1);
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  async function sendChat() {
    if (!chatInput.trim() || !user) return;
    const text = chatInput.trim(); setChatInput('');
    await supabase.from('game_chats').insert({ game_id: `battle-${id}`, user_id: user.id, username: profileRef.current?.username || 'Anonymous', message: text });
  }

  if (loading) {
    return (
      <main className={styles.main}>
        <div className={styles.loadingWrap}>
          <div className={styles.spinner}></div>
          <div className={styles.loadingText}>Loading battle room...</div>
        </div>
      </main>
    );
  }

  if (!battle) return null;

  const total = votes.player1 + votes.player2;
  const p1Pct = total === 0 ? 50 : Math.round((votes.player1 / total) * 100);
  const p2Pct = 100 - p1Pct;
  const isPlayer = authReady && user && (battle.player1_username === profile?.username || battle.player2_username === profile?.username);
  const isPlayer1 = profile?.username === battle.player1_username;
  const isP1 = profile?.username === battle.player1_username;
  const bothInRoom = !!battle?.player2_username && remoteTracks.length >= 1;
  const shareLink = typeof window !== 'undefined' ? window.location.href : '';
  const roundConfig = currentRound > 0 && currentRound <= TOTAL_ROUNDS ? ROUND_CONFIG[currentRound] : null;
  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const micLocked = currentRound > 0 && !battleEnded && roundConfig &&
    ((roundConfig.speaker === 'player1' && !isP1) || (roundConfig.speaker === 'player2' && isP1));

  return (
    <main className={styles.main}>
      <div className={styles.layout}>

        {/* LEFT: STAGE */}
        <div className={styles.stage}>

          {/* 1. Topic bar */}
          <div className={styles.topicBar}>
            <div className={styles.livePill}>
              <div className={styles.liveDot}></div>
              {battleEnded ? 'ENDED' : 'LIVE'}
            </div>
            <div className={styles.topicText}>"{battle.topic}"</div>
            <button className={styles.shareBtn} onClick={copyLink}>{copied ? '✓ Copied!' : '🔗 Share'}</button>
          </div>

          {/* 2. Round timer — visible when battle is running */}
          {currentRound > 0 && !battleEnded && roundConfig && (
            <div className={styles.roundBar}>
              <div>
                <div className={styles.roundLabel}>{roundConfig.label} of {TOTAL_ROUNDS}</div>
                <div className={styles.roundDesc}>{roundConfig.desc}</div>
              </div>
              <div className={styles.roundTimer} style={{ color: roundTimeLeft <= 10 ? '#EF4444' : roundTimeLeft <= 30 ? '#F59E0B' : '#3B82F6' }}>
                {formatTime(roundTimeLeft)}
              </div>
            </div>
          )}

          {/* 3. Winner banner */}
          {battleEnded && (
            <div className={styles.winnerBanner}>
              <div className={styles.winnerIcon}>{winner === 'tie' ? '🤝' : '🏆'}</div>
              <div className={styles.winnerText}>{winner === 'tie' ? "It's a tie!" : `@${winner} wins!`}</div>
              <div className={styles.winnerSub}>Final: {battle.player1_username} {votes.player1} — {votes.player2} {battle.player2_username}</div>
              <button onClick={() => router.push('/battle')} className={styles.backToBattlesBtn}>← Back to Battles</button>
            </div>
          )}

          {/* 4. VIDEO — takes all remaining space */}
          {!battleEnded && videoJoined ? (
            <div className={styles.videoWrap}>
              <div className={styles.videoMain}>
                {remoteTracks.length > 0 ? (
                  <RemoteVideoTrack track={remoteTracks[0].track} />
                ) : (
                  <div className={styles.videoWaiting}>
                    <div style={{ fontSize: '32px' }}>⏳</div>
                    <div>{isPlayer ? 'Waiting for opponent...' : 'Waiting for debaters...'}</div>
                  </div>
                )}
                {remoteTracks.length > 1 && (
                  <div className={styles.pip} style={{ bottom: '70px' }}>
                    <RemoteVideoTrack track={remoteTracks[1].track} />
                  </div>
                )}
                {isPlayer && (
                  <video ref={localVideoRef} autoPlay muted playsInline className={styles.localVideo}
                    style={{ bottom: remoteTracks.length > 1 ? '140px' : '70px', display: 'none' }} />
                )}
                {isPlayer && (
                  <div className={styles.controls}>
                    <button onClick={toggleMic} className={styles.controlBtn}
                      style={{ background: micLocked ? 'rgba(107,114,128,0.4)' : isMicOn ? 'rgba(255,255,255,0.15)' : 'rgba(239,68,68,0.5)', cursor: micLocked ? 'not-allowed' : 'pointer' }}
                      title={micLocked ? 'Not your turn' : isMicOn ? 'Mute' : 'Unmute'}>
                      {micLocked ? '🔒' : isMicOn ? '🎤' : '🔇'}
                    </button>
                    <button onClick={toggleCam} className={styles.controlBtn}
                      style={{ background: isCamOn ? 'rgba(255,255,255,0.15)' : 'rgba(239,68,68,0.5)' }}>
                      {isCamOn ? '📹' : '🚫'}
                    </button>
                    <button onClick={leaveVideo} className={styles.leaveBtn}>Leave</button>
                  </div>
                )}
                {!isPlayer && <button onClick={leaveVideo} className={styles.leaveBtnViewer}>Leave</button>}
              </div>

              {/* Start / waiting */}
              {isPlayer1 && bothInRoom && currentRound === 0 && (
                <button onClick={handleStartBattle} className={styles.startBattleBtn}>▶ Start Battle</button>
              )}
              {!isPlayer1 && isPlayer && bothInRoom && currentRound === 0 && (
                <div className={styles.waitingForP1}>⏳ Waiting for @{battle.player1_username} to start...</div>
              )}
            </div>
          ) : !battleEnded ? (
            <div className={styles.joinWrap}>
              <div className={styles.joinIcon}>⚔️</div>
              <div className={styles.joinTitle}>{battle.player2_username ? 'Battle is live' : 'Waiting for opponent'}</div>
              <p className={styles.joinSub}>
                {isPlayer ? 'Join the room to go live on camera.' : battle.player2_username ? 'Watch the debate live and cast your vote.' : 'Share the link below while you wait.'}
              </p>
              {videoError && <div className={styles.videoError}>{videoError}</div>}
              {battle.room_name && (battle.player2_username || isPlayer) && (
                <button className={styles.joinBtn} onClick={joinVideo}>
                  {isPlayer ? '🎥 Join as Debater' : '👁 Watch Live'}
                </button>
              )}
            </div>
          ) : null}

          {/* 5. Vote bar — always below video */}
          <div className={styles.voteSection}>
            <div className={styles.voteNames}>
              <span className={styles.voteNameBlue}>@{battle.player1_username}</span>
              <span className={styles.voteTally}>{total} votes</span>
              <span className={styles.voteNameRed}>@{battle.player2_username || '?'}</span>
            </div>
            <div className={styles.voteTrack}>
              <div className={styles.voteFill} style={{ width: `${p1Pct}%` }}></div>
            </div>
            <div className={styles.votePcts}>
              <span style={{ color: '#60A5FA' }}>{p1Pct}%</span>
              <span style={{ color: '#F87171' }}>{p2Pct}%</span>
            </div>
            {authReady && !voted && user && !isPlayer && !battleEnded && (
              <div className={styles.voteButtons}>
                <button className={`${styles.voteBtn} ${styles.voteBtnBlue}`} onClick={() => castVote('player1')}>Vote {battle.player1_username}</button>
                <button className={`${styles.voteBtn} ${styles.voteBtnRed}`} onClick={() => castVote('player2')}>Vote {battle.player2_username}</button>
              </div>
            )}
            {voted && <div className={styles.voteCast}>✓ Voted for {voted === 'player1' ? battle.player1_username : battle.player2_username}</div>}
            {isPlayer && !battleEnded && <div className={styles.playerNotice}>You're in this battle — voting disabled</div>}
            {authReady && !user && <div className={styles.loginPrompt}><Link href="/login" className={styles.loginLink}>Sign in</Link> to vote</div>}
          </div>

          {/* 6. Waiting for opponent share link */}
          {(battle.status === 'seeking' || !battle.player2_username) && !battleEnded && (
            <div className={styles.waitingCard}>
              <div className={styles.waitingTitle}>⏳ Waiting for opponent</div>
              <p className={styles.waitingSub}>Share this link to invite someone:</p>
              <div className={styles.linkBox}>
                <div className={styles.linkUrl}>{shareLink}</div>
                <button className={styles.copyBtn} onClick={copyLink}>{copied ? '✓' : '📋'}</button>
              </div>
            </div>
          )}

        </div>

        {/* RIGHT: CHAT SIDEBAR */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarTitle}>Live Chat</div>
          <div className={styles.chatMessages}>
            {messages.length === 0 && <div className={styles.chatEmpty}>No messages yet. Say something!</div>}
            {messages.map((m, i) => (
              <div key={i} className={styles.chatMsg}>
                <div className={styles.chatName}>{m.name} <span className={styles.chatTime}>{m.time}</span></div>
                <div className={`${styles.chatText} ${m.isMe ? styles.chatTextMe : ''}`}>{m.text}</div>
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>
          <div className={styles.chatInputRow}>
            <input className={styles.chatInput} placeholder={user ? 'Say something...' : 'Sign in to chat'}
              value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendChat()} disabled={!user} />
            <button className={styles.chatSend} onClick={sendChat} disabled={!user}>↑</button>
          </div>
        </div>

      </div>
    </main>
  );
}

function RemoteVideoTrack({ track }) {
  const videoRef = useRef(null);
  useEffect(() => {
    if (track?.mediaStreamTrack && videoRef.current) videoRef.current.srcObject = new MediaStream([track.mediaStreamTrack]);
    return () => { if (videoRef.current) videoRef.current.srcObject = null; };
  }, [track]);
  return <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
}
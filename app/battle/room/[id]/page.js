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
  3: { label: 'Round 3', desc: 'Open mic — both players speak freely', speaker: 'both' },
};

export default function BattleRoom({ params }) {
  const { id } = use(params);
  const router = useRouter();

  const [battle, setBattle] = useState(null);
  const [user, setUser] = useState(null);
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
  const roundStartTimeRef = useRef(null);
  const roundTimerRef = useRef(null);
  const currentRoundRef = useRef(0);
  const chatBottomRef = useRef(null);
  const profileRef = useRef(null);
  const battleRef = useRef(null);
  const votesRef = useRef({ player1: 0, player2: 0 });

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const { data: profileData } = await supabase
          .from('profiles').select('username, full_name').eq('id', currentUser.id).maybeSingle();
        setProfile(profileData);
        profileRef.current = profileData;
      }

      const { data: battleData } = await supabase
        .from('battles').select('*').eq('id', id).single();

      if (!battleData) { router.push('/battle'); return; }
      setBattle(battleData);
      battleRef.current = battleData;

      if (battleData.status === 'ended' && battleData.winner) {
        setBattleEnded(true);
        setWinner(battleData.winner);
        setCurrentRound(TOTAL_ROUNDS);
      }

      const { data: voteData } = await supabase.from('votes').select('side').eq('battle_id', id);
      if (voteData) {
        const v = { player1: voteData.filter(v => v.side === 'player1').length, player2: voteData.filter(v => v.side === 'player2').length };
        setVotes(v);
        votesRef.current = v;
      }

      if (currentUser) {
        const { data: existingVote } = await supabase.from('votes').select('side').eq('battle_id', id).eq('user_id', currentUser.id).maybeSingle();
        if (existingVote) setVoted(existingVote.side);
      }

      setLoading(false);

      supabase.channel(`votes-${id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'votes', filter: `battle_id=eq.${id}` }, () => loadVotes())
        .subscribe();

      supabase.channel(`battle-status-${id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'battles', filter: `id=eq.${id}` }, (payload) => {
          const updated = payload.new;
          setBattle(updated);
          battleRef.current = updated;
          if (updated.status === 'ended' && updated.winner) {
            setBattleEnded(true);
            setWinner(updated.winner);
            clearInterval(roundTimerRef.current);
          }
        })
        .subscribe();

      supabase.channel(`round-sync-${id}`, { config: { broadcast: { self: false } } })
        .on('broadcast', { event: 'start-round' }, ({ payload }) => startRound(payload.round))
        .subscribe();

      supabase.channel(`battle-chat-${id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_chats', filter: `game_id=eq.battle-${id}` }, (payload) => {
          const row = payload.new;
          setMessages(prev => [...prev, {
            name: row.username, text: row.message,
            isMe: row.user_id === currentUser?.id,
            time: new Date(row.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          }]);
        })
        .subscribe();

      const { data: existingChats } = await supabase
        .from('game_chats').select('*').eq('game_id', `battle-${id}`)
        .order('created_at', { ascending: true }).limit(100);

      if (existingChats) {
        setMessages(existingChats.map(row => ({
          name: row.username, text: row.message,
          isMe: row.user_id === currentUser?.id,
          time: new Date(row.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        })));
      }
    }

    init();

    function handleVisibility() {
      if (document.visibilityState === 'visible' && roundStartTimeRef.current && currentRoundRef.current > 0) {
        const elapsed = Math.floor((Date.now() - roundStartTimeRef.current) / 1000);
        const remaining = Math.max(0, ROUND_DURATION - elapsed);
        setRoundTimeLeft(remaining);
        if (remaining === 0) {
          clearInterval(roundTimerRef.current);
          const next = currentRoundRef.current + 1;
          if (next > TOTAL_ROUNDS) declareWinner();
          else startRound(next);
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(roundTimerRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
      leaveVideo();
    };
  }, [id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function startRound(round) {
    clearInterval(roundTimerRef.current);
    currentRoundRef.current = round;
    roundStartTimeRef.current = Date.now();
    setCurrentRound(round);
    setRoundTimeLeft(ROUND_DURATION);
    enforceMicForRound(round);

    roundTimerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - roundStartTimeRef.current) / 1000);
      const remaining = Math.max(0, ROUND_DURATION - elapsed);
      setRoundTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(roundTimerRef.current);
        const next = currentRoundRef.current + 1;
        if (next > TOTAL_ROUNDS) declareWinner();
        else startRound(next);
      }
    }, 1000);
  }

  async function enforceMicForRound(round) {
    if (!roomRef.current) return;
    const isP1 = battleRef.current?.player1_username === profileRef.current?.username;
    const { speaker } = ROUND_CONFIG[round];
    const shouldHaveMic = speaker === 'both' || (speaker === 'player1' && isP1) || (speaker === 'player2' && !isP1);
    try {
      await roomRef.current.localParticipant.setMicrophoneEnabled(shouldHaveMic);
      setIsMicOn(shouldHaveMic);
    } catch {}
  }

  async function declareWinner() {
    const v = votesRef.current;
    const b = battleRef.current;
    if (!b) return;
    const winnerUsername = v.player1 > v.player2 ? b.player1_username : v.player2 > v.player1 ? b.player2_username : 'tie';
    await supabase.from('battles').update({ status: 'ended', winner: winnerUsername, ended_at: new Date().toISOString() }).eq('id', id);
    setBattleEnded(true);
    setWinner(winnerUsername);
  }

  async function loadVotes() {
    const { data } = await supabase.from('votes').select('side').eq('battle_id', id);
    if (data) {
      const v = { player1: data.filter(v => v.side === 'player1').length, player2: data.filter(v => v.side === 'player2').length };
      setVotes(v);
      votesRef.current = v;
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
    const battleData = battleRef.current;
    const profileData = profileRef.current;
    if (!battleData?.room_name) {
      setVideoError('Room not ready. Please try again.');
      return;
    }

    setVideoError('');

    try {
      const { Room, RoomEvent, Track } = await import('livekit-client');

      // Determine if this user is a debater or viewer
      const isDebater = profileData && (
        battleData.player1_username === profileData.username ||
        battleData.player2_username === profileData.username
      );

      // Get token
      const tokenRes = await fetch('/api/livekit-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: battleData.room_name,
          participantName: profileData?.username || `viewer-${Date.now()}`,
          canPublish: isDebater,
        }),
      });
      const { token, error: tokenError } = await tokenRes.json();
      if (tokenError) throw new Error(tokenError);

      // Create and connect room
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });
      roomRef.current = room;

      // Handle remote tracks (for viewers watching debaters)
      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (track.kind === Track.Kind.Video) {
          setRemoteTracks(prev => [...prev, { track, participant }]);
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        setRemoteTracks(prev => prev.filter(t => t.track !== track));
      });

      room.on(RoomEvent.Disconnected, () => {
        setVideoJoined(false);
        setRemoteTracks([]);
      });

      await room.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL || '', token);

      // Debaters enable camera + mic, viewers just watch
      if (isDebater) {
        await room.localParticipant.setCameraEnabled(true);
        await room.localParticipant.setMicrophoneEnabled(true);

        // Attach local video
        const localVideoPublication = room.localParticipant.getTrackPublication(Track.Source.Camera);
        if (localVideoPublication?.track && localVideoRef.current) {
          localVideoPublication.track.attach(localVideoRef.current);
        }
      }

      setVideoJoined(true);
    } catch (err) {
      console.error('LiveKit join error:', err);
      setVideoError('Could not join: ' + err.message);
    }
  }

  async function leaveVideo() {
    if (roomRef.current) {
      try { await roomRef.current.disconnect(); } catch {}
      roomRef.current = null;
    }
    setVideoJoined(false);
    setRemoteTracks([]);

    if (battleRef.current && profileRef.current && (
      battleRef.current.player1_username === profileRef.current.username ||
      battleRef.current.player2_username === profileRef.current.username
    )) {
      supabase.from('battles').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', id);
    }
  }

  async function toggleMic() {
    if (!roomRef.current) return;
    const enabled = !isMicOn;
    await roomRef.current.localParticipant.setMicrophoneEnabled(enabled);
    setIsMicOn(enabled);
  }

  async function toggleCam() {
    if (!roomRef.current) return;
    const enabled = !isCamOn;
    await roomRef.current.localParticipant.setCameraEnabled(enabled);
    setIsCamOn(enabled);
  }

  function handleStartBattle() {
    if (!battleRef.current?.player2_username) return;
    supabase.channel(`round-sync-${id}`).send({ type: 'broadcast', event: 'start-round', payload: { round: 1 } });
    startRound(1);
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function sendChat() {
    if (!chatInput.trim() || !user) return;
    const text = chatInput.trim();
    setChatInput('');
    await supabase.from('game_chats').insert({
      game_id: `battle-${id}`,
      user_id: user.id,
      username: profileRef.current?.username || 'Anonymous',
      message: text,
    });
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
  const isPlayer = user && (battle.player1_username === profile?.username || battle.player2_username === profile?.username);
  const isPlayer1 = profile?.username === battle.player1_username;
  const bothInRoom = !!battle?.player2_username && remoteTracks.length >= 1;
  const shareLink = typeof window !== 'undefined' ? window.location.href : '';
  const roundConfig = currentRound > 0 ? ROUND_CONFIG[currentRound] : null;
  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <main className={styles.main}>
      <div className={styles.layout}>
        <div className={styles.stage}>

          {/* Topic bar */}
          <div className={styles.topicBar}>
            <div className={styles.livePill}>
              <div className={styles.liveDot}></div>
              {battleEnded ? 'ENDED' : 'LIVE'}
            </div>
            <div className={styles.topicText}>"{battle.topic}"</div>
            <button className={styles.shareBtn} onClick={copyLink}>
              {copied ? '✓ Copied!' : '🔗 Share'}
            </button>
          </div>

          {/* Round indicator */}
          {currentRound > 0 && !battleEnded && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#0f1623', border: '1px solid rgba(255,255,255,0.065)',
              borderRadius: '12px', padding: '0.75rem 1.25rem',
            }}>
              <div>
                <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '14px', color: '#EEF2FF' }}>
                  {roundConfig.label} of {TOTAL_ROUNDS}
                </div>
                <div style={{ fontSize: '12px', color: '#6B7A9E', marginTop: '2px' }}>{roundConfig.desc}</div>
              </div>
              <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '24px', color: roundTimeLeft <= 10 ? '#EF4444' : '#3B82F6' }}>
                {formatTime(roundTimeLeft)}
              </div>
            </div>
          )}

          {/* Winner banner */}
          {battleEnded && (
            <div style={{
              background: winner === 'tie' ? 'rgba(107,114,128,0.15)' : 'rgba(16,185,129,0.1)',
              border: `1px solid ${winner === 'tie' ? 'rgba(107,114,128,0.3)' : 'rgba(16,185,129,0.3)'}`,
              borderRadius: '14px', padding: '1.5rem', textAlign: 'center',
            }}>
              <div style={{ fontSize: '36px', marginBottom: '0.5rem' }}>{winner === 'tie' ? '🤝' : '🏆'}</div>
              <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '20px', color: '#EEF2FF', marginBottom: '4px' }}>
                {winner === 'tie' ? "It's a tie!" : `@${winner} wins!`}
              </div>
              <div style={{ fontSize: '13px', color: '#6B7A9E' }}>
                Final vote: {battle.player1_username} {votes.player1} — {votes.player2} {battle.player2_username}
              </div>
            </div>
          )}

          {/* Video */}
          {videoJoined ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{
                width: '100%', aspectRatio: '16/9', background: '#000',
                borderRadius: '14px', overflow: 'hidden', position: 'relative',
              }}>
                {/* Remote videos — debaters seen by everyone */}
                {remoteTracks.length > 0 ? (
                  <RemoteVideoTrack track={remoteTracks[0].track} />
                ) : (
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex',
                    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    color: '#6B7A9E', fontSize: '14px', gap: '8px',
                  }}>
                    <div style={{ fontSize: '32px' }}>⏳</div>
                    {isPlayer ? 'Waiting for opponent...' : 'Waiting for debaters to join...'}
                  </div>
                )}

                {/* Second remote video if 2 debaters */}
                {remoteTracks.length > 1 && (
                  <div style={{
                    position: 'absolute', bottom: '70px', right: '12px',
                    width: '28%', maxWidth: '180px', aspectRatio: '16/9',
                    borderRadius: '10px', overflow: 'hidden',
                    border: '2px solid rgba(255,255,255,0.15)',
                  }}>
                    <RemoteVideoTrack track={remoteTracks[1].track} />
                  </div>
                )}

                {/* Local video PiP for debaters */}
                {isPlayer && (
                  <video
                    ref={localVideoRef}
                    autoPlay muted playsInline
                    style={{
                      position: 'absolute',
                      bottom: remoteTracks.length > 1 ? '140px' : '70px',
                      right: '12px',
                      width: '28%', maxWidth: '180px', aspectRatio: '16/9',
                      objectFit: 'cover', borderRadius: '10px',
                      border: '2px solid rgba(59,130,246,0.4)',
                      transform: 'scaleX(-1)',
                    }}
                  />
                )}

                {/* Controls for debaters */}
                {isPlayer && (
                  <div style={{
                    position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
                    display: 'flex', gap: '10px', alignItems: 'center',
                    background: 'rgba(0,0,0,0.7)', borderRadius: '100px',
                    padding: '8px 16px', backdropFilter: 'blur(10px)',
                  }}>
                    <button onClick={toggleMic} style={{
                      width: '40px', height: '40px', borderRadius: '50%', border: 'none',
                      background: isMicOn ? 'rgba(255,255,255,0.15)' : 'rgba(239,68,68,0.5)',
                      fontSize: '18px', cursor: 'pointer',
                    }}>{isMicOn ? '🎤' : '🔇'}</button>
                    <button onClick={toggleCam} style={{
                      width: '40px', height: '40px', borderRadius: '50%', border: 'none',
                      background: isCamOn ? 'rgba(255,255,255,0.15)' : 'rgba(239,68,68,0.5)',
                      fontSize: '18px', cursor: 'pointer',
                    }}>{isCamOn ? '📹' : '🚫'}</button>
                    <button onClick={leaveVideo} style={{
                      background: '#EF4444', border: 'none', borderRadius: '100px',
                      padding: '8px 18px', color: 'white',
                      fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                    }}>Leave</button>
                  </div>
                )}

                {/* Leave for viewers */}
                {!isPlayer && (
                  <button onClick={leaveVideo} style={{
                    position: 'absolute', bottom: '16px', right: '16px',
                    background: 'rgba(239,68,68,0.8)', border: 'none', borderRadius: '100px',
                    padding: '8px 16px', color: 'white',
                    fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                  }}>Leave</button>
                )}
              </div>

              {/* Start / waiting */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {isPlayer1 && bothInRoom && currentRound === 0 && !battleEnded && (
                  <button onClick={handleStartBattle} style={{
                    background: '#10B981', border: 'none', borderRadius: '100px',
                    padding: '10px 24px', color: 'white',
                    fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                  }}>▶ Start Battle</button>
                )}
                {!isPlayer1 && isPlayer && bothInRoom && currentRound === 0 && !battleEnded && (
                  <div style={{
                    background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
                    borderRadius: '100px', padding: '10px 20px', fontSize: '13px', color: '#60A5FA', fontWeight: 600,
                  }}>⏳ Waiting for Player 1 to start...</div>
                )}
              </div>
            </div>
          ) : (
            <div className={styles.joinVideoWrap}>
              <div className={styles.joinVideoIcon}>⚔️</div>
              <div className={styles.joinVideoTitle}>
                {battle.player2_username ? 'Battle is live' : 'Waiting for opponent'}
              </div>
              <p className={styles.joinVideoSub}>
                {isPlayer
                  ? 'Join the room to go live on camera.'
                  : battle.player2_username
                    ? 'Watch the debate live and cast your vote.'
                    : 'Share the link below while you wait.'}
              </p>
              {videoError && (
                <div style={{ fontSize: '13px', color: '#F87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '8px 14px' }}>
                  {videoError}
                </div>
              )}
              {battle.room_name && (
                <button className={styles.joinVideoBtn} onClick={joinVideo}>
                  {isPlayer ? '🎥 Join as Debater' : '👁 Watch Live'}
                </button>
              )}
            </div>
          )}

          {/* Vote area */}
          <div className={styles.voteSection}>
            <div className={styles.voteBar}>
              <div className={styles.voteBarFill} style={{ width: `${p1Pct}%` }}></div>
            </div>
            <div className={styles.votePcts}>
              <span style={{ color: '#60A5FA' }}>{battle.player1_username || 'Player 1'} — {p1Pct}%</span>
              <span style={{ color: '#6B7A9E', fontSize: '12px' }}>{total} votes</span>
              <span style={{ color: '#F87171' }}>{p2Pct}% — {battle.player2_username || 'Player 2'}</span>
            </div>
            {!voted && user && !isPlayer && !battleEnded && (
              <div className={styles.voteButtons}>
                <button className={`${styles.voteBtn} ${styles.voteBtnBlue}`} onClick={() => castVote('player1')}>
                  Vote for {battle.player1_username || 'Player 1'}
                </button>
                <button className={`${styles.voteBtn} ${styles.voteBtnRed}`} onClick={() => castVote('player2')}>
                  Vote for {battle.player2_username || 'Player 2'}
                </button>
              </div>
            )}
            {voted && <div className={styles.voteCast}>✓ Vote cast — {voted === 'player1' ? battle.player1_username : battle.player2_username}</div>}
            {isPlayer && !battleEnded && <div className={styles.playerNotice}>You're in this battle — you can't vote on your own debate</div>}
            {!user && <div className={styles.loginPrompt}><Link href="/login" className={styles.loginLink}>Sign in</Link> to vote</div>}
          </div>

          {/* Waiting card */}
          {(battle.status === 'seeking' || !battle.player2_username) && !battleEnded && (
            <div className={styles.waitingCard}>
              <div className={styles.waitingTitle}>⏳ Waiting for opponent</div>
              <p className={styles.waitingSub}>Share this link to invite someone to debate you:</p>
              <div className={styles.linkBox}>
                <div className={styles.linkUrl}>{shareLink}</div>
                <button className={styles.copyBtn} onClick={copyLink}>{copied ? '✓' : '📋'}</button>
              </div>
            </div>
          )}

        </div>

        {/* Sidebar */}
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
            <input
              className={styles.chatInput}
              placeholder={user ? 'Say something...' : 'Sign in to chat'}
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendChat()}
              disabled={!user}
            />
            <button className={styles.chatSend} onClick={sendChat} disabled={!user}>↑</button>
          </div>
        </div>

      </div>
    </main>
  );
}

// Helper component to attach a LiveKit track to a video element
function RemoteVideoTrack({ track }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (track && videoRef.current) {
      track.attach(videoRef.current);
      return () => { try { track.detach(videoRef.current); } catch {} };
    }
  }, [track]);

  return (
    <video
      ref={videoRef}
      autoPlay playsInline
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
  );
}
'use client';
import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../supabase';
import styles from './room.module.css';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const ROUND_DURATION = 120; // 2 minutes per round
const TOTAL_ROUNDS = 3;

// Round config: who can speak
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
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('');

  // Round system
  const [currentRound, setCurrentRound] = useState(0); // 0 = not started
  const [roundTimeLeft, setRoundTimeLeft] = useState(ROUND_DURATION);
  const [battleEnded, setBattleEnded] = useState(false);
  const [winner, setWinner] = useState(null);
  const roundTimerRef = useRef(null);
  const currentRoundRef = useRef(0);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const signalingChannelRef = useRef(null);
  const localStreamRef = useRef(null);
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
          .from('profiles')
          .select('username, full_name')
          .eq('id', currentUser.id)
          .maybeSingle();
        setProfile(profileData);
        profileRef.current = profileData;
      }

      const { data: battleData } = await supabase
        .from('battles')
        .select('*')
        .eq('id', id)
        .single();

      if (!battleData) { router.push('/battle'); return; }
      setBattle(battleData);
      battleRef.current = battleData;

      // If battle already ended, show winner
      if (battleData.status === 'ended' && battleData.winner) {
        setBattleEnded(true);
        setWinner(battleData.winner);
        setCurrentRound(TOTAL_ROUNDS);
      }

      const { data: voteData } = await supabase
        .from('votes')
        .select('side')
        .eq('battle_id', id);

      if (voteData) {
        const v = {
          player1: voteData.filter(v => v.side === 'player1').length,
          player2: voteData.filter(v => v.side === 'player2').length,
        };
        setVotes(v);
        votesRef.current = v;
      }

      if (currentUser) {
        const { data: existingVote } = await supabase
          .from('votes')
          .select('side')
          .eq('battle_id', id)
          .eq('user_id', currentUser.id)
          .maybeSingle();
        if (existingVote) setVoted(existingVote.side);
      }

      setLoading(false);

      // Vote realtime
      const voteChannel = supabase
        .channel(`votes-${id}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'votes',
          filter: `battle_id=eq.${id}`,
        }, () => loadVotes())
        .subscribe();

      // Battle status realtime — catches winner updates from other clients
      const battleChannel = supabase
        .channel(`battle-status-${id}`)
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'battles',
          filter: `id=eq.${id}`,
        }, (payload) => {
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

      // Chat realtime
      const chatChannel = supabase
        .channel(`battle-chat-${id}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'game_chats',
          filter: `game_id=eq.battle-${id}`,
        }, (payload) => {
          const row = payload.new;
          setMessages(prev => [...prev, {
            name: row.username,
            text: row.message,
            isMe: row.user_id === currentUser?.id,
            time: new Date(row.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          }]);
        })
        .subscribe();

      const { data: existingChats } = await supabase
        .from('game_chats')
        .select('*')
        .eq('game_id', `battle-${id}`)
        .order('created_at', { ascending: true })
        .limit(100);

      if (existingChats) {
        setMessages(existingChats.map(row => ({
          name: row.username,
          text: row.message,
          isMe: row.user_id === currentUser?.id,
          time: new Date(row.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        })));
      }

      return () => {
        supabase.removeChannel(voteChannel);
        supabase.removeChannel(battleChannel);
        supabase.removeChannel(chatChannel);
      };
    }

    init();
    return () => {
      cleanupWebRTC();
      clearInterval(roundTimerRef.current);
    };
  }, [id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Round timer ─────────────────────────────────────────────────────────────

  function startRound(round) {
    clearInterval(roundTimerRef.current);
    currentRoundRef.current = round;
    setCurrentRound(round);
    setRoundTimeLeft(ROUND_DURATION);
    enforceMicForRound(round);

    roundTimerRef.current = setInterval(() => {
      setRoundTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(roundTimerRef.current);
          const nextRound = currentRoundRef.current + 1;
          if (nextRound > TOTAL_ROUNDS) {
            declareWinner();
          } else {
            startRound(nextRound);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function enforceMicForRound(round) {
    const profileData = profileRef.current;
    const battleData = battleRef.current;
    if (!profileData || !battleData || !localStreamRef.current) return;

    const isPlayer1 = battleData.player1_username === profileData.username;
    const config = ROUND_CONFIG[round];

    let shouldHaveMic = true;
    if (config.speaker === 'player1') shouldHaveMic = isPlayer1;
    else if (config.speaker === 'player2') shouldHaveMic = !isPlayer1;
    else shouldHaveMic = true; // round 3 both speak

    localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = shouldHaveMic; });
    setMicOn(shouldHaveMic);
  }

  async function declareWinner() {
    const v = votesRef.current;
    const battleData = battleRef.current;
    if (!battleData) return;

    let winnerUsername = null;
    if (v.player1 > v.player2) winnerUsername = battleData.player1_username;
    else if (v.player2 > v.player1) winnerUsername = battleData.player2_username;
    else winnerUsername = 'tie';

    await supabase.from('battles').update({
      status: 'ended',
      winner: winnerUsername,
      ended_at: new Date().toISOString(),
    }).eq('id', id);

    setBattleEnded(true);
    setWinner(winnerUsername);
  }

  async function loadVotes() {
    const { data } = await supabase.from('votes').select('side').eq('battle_id', id);
    if (data) {
      const v = {
        player1: data.filter(v => v.side === 'player1').length,
        player2: data.filter(v => v.side === 'player2').length,
      };
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

  // ── WebRTC ───────────────────────────────────────────────────────────────────

  function createPeerConnection(stream, battleData, profileData) {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
      setRemoteConnected(true);
      setConnectionStatus('Connected!');
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && signalingChannelRef.current) {
        signalingChannelRef.current.send({
          type: 'broadcast', event: 'ice-candidate',
          payload: { candidate: event.candidate, from: profileData.username },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') { setConnectionStatus('Connected!'); setRemoteConnected(true); }
      else if (state === 'disconnected' || state === 'failed') { setConnectionStatus('Opponent disconnected'); setRemoteConnected(false); }
    };

    return pc;
  }

  async function joinVideo() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setVideoJoined(true);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const { data: battleData } = await supabase.from('battles').select('*').eq('id', id).single();
      const profileData = profileRef.current;
      const isPlayer1 = battleData.player1_username === profileData?.username;

      if (isPlayer1) {
        await supabase.from('battles').update({ status: 'waiting' }).eq('id', id);
      } else {
        await supabase.from('battles').update({ status: 'live', player2_username: profileData?.username }).eq('id', id);
      }

      setBattle(prev => ({
        ...prev,
        status: isPlayer1 ? 'waiting' : 'live',
        player2_username: isPlayer1 ? prev.player2_username : profileData?.username,
      }));

      const signalingChannel = supabase.channel(`webrtc-${id}`, { config: { broadcast: { self: false } } });
      signalingChannelRef.current = signalingChannel;
      const pc = createPeerConnection(stream, battleData, profileData);

      signalingChannel
        .on('broadcast', { event: 'offer' }, async ({ payload }) => {
          if (payload.to !== profileData?.username) return;
          setConnectionStatus('Connecting...');
          await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          signalingChannel.send({ type: 'broadcast', event: 'answer', payload: { answer, to: payload.from, from: profileData?.username } });
        })
        .on('broadcast', { event: 'answer' }, async ({ payload }) => {
          if (payload.to !== profileData?.username) return;
          await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
        })
        .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
          if (payload.from === profileData?.username) return;
          try { await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)); } catch (e) { console.warn('ICE error:', e); }
        })
        .on('broadcast', { event: 'peer-joined' }, async ({ payload }) => {
          if (isPlayer1 && payload.username !== profileData?.username) {
            setConnectionStatus('Opponent joined — connecting...');
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            signalingChannel.send({ type: 'broadcast', event: 'offer', payload: { offer, to: payload.username, from: profileData?.username } });
          }
        })
        .on('broadcast', { event: 'start-round' }, ({ payload }) => {
          // Sync round start across both players
          startRound(payload.round);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            signalingChannel.send({ type: 'broadcast', event: 'peer-joined', payload: { username: profileData?.username } });
            if (!isPlayer1) setConnectionStatus('Waiting for opponent camera...');
          }
        });

    } catch (err) {
      alert('Could not access camera/microphone. Please check permissions.');
    }
  }

  function handleStartBattle() {
    // Player 1 triggers the start — broadcasts round 1 to both players
    signalingChannelRef.current?.send({
      type: 'broadcast', event: 'start-round', payload: { round: 1 },
    });
    startRound(1);
  }

  function cleanupWebRTC() {
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    if (signalingChannelRef.current) { supabase.removeChannel(signalingChannelRef.current); signalingChannelRef.current = null; }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
  }

  function leaveVideo() {
    clearInterval(roundTimerRef.current);
    cleanupWebRTC();
    setVideoJoined(false);
    setRemoteConnected(false);
    setMicOn(true);
    setCamOn(true);
    setConnectionStatus('');
    setCurrentRound(0);

    if (battle && profileRef.current && (
      battle.player1_username === profileRef.current.username ||
      battle.player2_username === profileRef.current.username
    )) {
      supabase.from('battles').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', id);
    }
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
              <div style={{
                fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '24px',
                color: roundTimeLeft <= 10 ? '#EF4444' : '#3B82F6',
              }}>
                {formatTime(roundTimeLeft)}
              </div>
            </div>
          )}

          {/* Winner banner */}
          {battleEnded && (
            <div style={{
              background: winner === 'tie'
                ? 'rgba(107,114,128,0.15)'
                : 'rgba(16,185,129,0.1)',
              border: `1px solid ${winner === 'tie' ? 'rgba(107,114,128,0.3)' : 'rgba(16,185,129,0.3)'}`,
              borderRadius: '14px', padding: '1.5rem', textAlign: 'center',
            }}>
              <div style={{ fontSize: '36px', marginBottom: '0.5rem' }}>
                {winner === 'tie' ? '🤝' : '🏆'}
              </div>
              <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '20px', color: '#EEF2FF', marginBottom: '4px' }}>
                {winner === 'tie' ? "It's a tie!" : `@${winner} wins!`}
              </div>
              <div style={{ fontSize: '13px', color: '#6B7A9E' }}>
                Final vote: {battle.player1_username} {votes.player1} — {votes.player2} {battle.player2_username}
              </div>
            </div>
          )}

          {/* Video stage */}
          {videoJoined ? (
            <div className={styles.videoStage}>
              <video ref={remoteVideoRef} autoPlay playsInline className={styles.remoteVideo} />
              {!remoteConnected && (
                <div className={styles.remoteWaiting}>
                  <div className={styles.remoteWaitingIcon}>⏳</div>
                  <div className={styles.remoteWaitingText}>{connectionStatus || 'Waiting for opponent to join...'}</div>
                </div>
              )}
              <video
                ref={el => { localVideoRef.current = el; if (el && localStreamRef.current) el.srcObject = localStreamRef.current; }}
                autoPlay muted playsInline className={styles.localVideo}
              />
              {connectionStatus && remoteConnected && (
                <div className={styles.connectionBadge}>🟢 {connectionStatus}</div>
              )}

              {/* Muted indicator */}
              {!micOn && (
                <div style={{
                  position: 'absolute', top: '12px', left: '12px',
                  background: 'rgba(239,68,68,0.9)', color: 'white',
                  fontSize: '11px', fontWeight: 700, borderRadius: '100px',
                  padding: '4px 10px',
                }}>
                  🔇 Your mic is muted this round
                </div>
              )}

              <div className={styles.videoControls}>
                {/* Start battle button — only Player 1, only when both connected, round not started */}
                {isPlayer1 && remoteConnected && currentRound === 0 && !battleEnded && (
                  <button
                    onClick={handleStartBattle}
                    style={{
                      background: '#10B981', border: 'none', borderRadius: '100px',
                      padding: '0 20px', height: '44px', color: 'white',
                      fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    ▶ Start Battle
                  </button>
                )}
                <button
                  className={`${styles.controlBtn} ${micOn ? '' : styles.controlBtnOff}`}
                  onClick={() => {
                    // Only allow manual mic toggle in round 3 or before battle starts
                    if (currentRound === 3 || currentRound === 0) {
                      localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !micOn; });
                      setMicOn(m => !m);
                    }
                  }}
                  title={currentRound > 0 && currentRound < 3 ? 'Mic controlled by round rules' : ''}
                >
                  {micOn ? '🎤' : '🔇'}
                </button>
                <button
                  className={`${styles.controlBtn} ${camOn ? '' : styles.controlBtnOff}`}
                  onClick={() => {
                    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !camOn; });
                    setCamOn(c => !c);
                  }}
                >
                  {camOn ? '📹' : '🚫'}
                </button>
                <button className={`${styles.controlBtn} ${styles.controlBtnLeave}`} onClick={leaveVideo}>
                  Leave
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.joinVideoWrap}>
              <div className={styles.joinVideoIcon}>⚔️</div>
              <div className={styles.joinVideoTitle}>
                {battle.player2_username ? 'Your opponent is ready' : 'Waiting for opponent'}
              </div>
              <p className={styles.joinVideoSub}>
                {battle.player2_username
                  ? 'Tap Join Room to go live and start the debate.'
                  : 'Share the link below while you wait. Tap Join Room when ready.'}
              </p>
              {battle.room_url && (
                <button className={styles.joinVideoBtn} onClick={joinVideo}>
                  🎥 Join Room
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

            {voted && (
              <div className={styles.voteCast}>✓ Vote cast — {voted === 'player1' ? battle.player1_username : battle.player2_username}</div>
            )}
            {isPlayer && !battleEnded && (
              <div className={styles.playerNotice}>You're in this battle — you can't vote on your own debate</div>
            )}
            {!user && (
              <div className={styles.loginPrompt}>
                <Link href="/login" className={styles.loginLink}>Sign in</Link> to vote
              </div>
            )}
          </div>

          {/* Waiting card */}
          {(battle.status === 'waiting' || !battle.player2_username) && !battleEnded && (
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

        {/* SIDEBAR CHAT */}
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
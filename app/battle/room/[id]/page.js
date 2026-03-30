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
  const [localStream, setLocalStream] = useState(null);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('');

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const signalingChannelRef = useRef(null);
  const chatChannelRef = useRef(null);
  const localStreamRef = useRef(null);
  const chatBottomRef = useRef(null);
  const profileRef = useRef(null);

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
          .single();
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

      const { data: voteData } = await supabase
        .from('votes')
        .select('side')
        .eq('battle_id', id);

      if (voteData) {
        setVotes({
          player1: voteData.filter(v => v.side === 'player1').length,
          player2: voteData.filter(v => v.side === 'player2').length,
        });
      }

      if (currentUser) {
        const { data: existingVote } = await supabase
          .from('votes')
          .select('side')
          .eq('battle_id', id)
          .eq('user_id', currentUser.id)
          .single();
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

      // Chat realtime — uses game_chats table (already has realtime enabled)
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

      chatChannelRef.current = chatChannel;

      // Load existing chat messages
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
        supabase.removeChannel(chatChannel);
      };
    }

    init();

    return () => {
      cleanupWebRTC();
    };
  }, [id]);

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadVotes() {
    const { data } = await supabase.from('votes').select('side').eq('battle_id', id);
    if (data) {
      setVotes({
        player1: data.filter(v => v.side === 'player1').length,
        player2: data.filter(v => v.side === 'player2').length,
      });
    }
  }

  async function castVote(side) {
    if (voted || !user) return;
    setVoted(side);
    setVotes(v => ({ ...v, [side]: v[side] + 1 }));
    const { error } = await supabase.from('votes').insert({ battle_id: id, user_id: user.id, side });
    if (error) { setVoted(null); setVotes(v => ({ ...v, [side]: v[side] - 1 })); }
  }

  // ── WebRTC ──────────────────────────────────────────────────────────────────

  function createPeerConnection(stream, battleData, profileData) {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    // Add local tracks
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    // When we get a remote track, show it
    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
      setRemoteConnected(true);
      setConnectionStatus('Connected!');
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && signalingChannelRef.current) {
        signalingChannelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            candidate: event.candidate,
            from: profileData.username,
          },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') {
        setConnectionStatus('Connected!');
        setRemoteConnected(true);
      } else if (state === 'disconnected' || state === 'failed') {
        setConnectionStatus('Opponent disconnected');
        setRemoteConnected(false);
      }
    };

    return pc;
  }

  async function joinVideo() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      setVideoJoined(true);

      // Fetch fresh battle data to know player positions
      const { data: battleData } = await supabase
        .from('battles')
        .select('*')
        .eq('id', id)
        .single();

      const profileData = profileRef.current;
      const isPlayer1 = battleData.player1_username === profileData?.username;

      // Update battle status
      if (isPlayer1) {
        await supabase.from('battles').update({ status: 'waiting' }).eq('id', id);
      } else {
        await supabase.from('battles').update({
          status: 'live',
          player2_username: profileData?.username,
        }).eq('id', id);
      }

      setBattle(prev => ({
        ...prev,
        status: isPlayer1 ? 'waiting' : 'live',
        player2_username: isPlayer1 ? prev.player2_username : profileData?.username,
      }));

      // Set up signaling channel
      const signalingChannel = supabase.channel(`webrtc-${id}`, {
        config: { broadcast: { self: false } },
      });
      signalingChannelRef.current = signalingChannel;

      const pc = createPeerConnection(stream, battleData, profileData);

      signalingChannel
        .on('broadcast', { event: 'offer' }, async ({ payload }) => {
          if (payload.to !== profileData?.username) return;
          setConnectionStatus('Connecting...');
          await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          signalingChannel.send({
            type: 'broadcast',
            event: 'answer',
            payload: { answer, to: payload.from, from: profileData?.username },
          });
        })
        .on('broadcast', { event: 'answer' }, async ({ payload }) => {
          if (payload.to !== profileData?.username) return;
          await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
        })
        .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
          if (payload.from === profileData?.username) return;
          try {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } catch (e) {
            console.warn('ICE candidate error:', e);
          }
        })
        .on('broadcast', { event: 'peer-joined' }, async ({ payload }) => {
          // Player 1 initiates the offer when player 2 joins
          if (isPlayer1 && payload.username !== profileData?.username) {
            setConnectionStatus('Opponent joined — connecting...');
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            signalingChannel.send({
              type: 'broadcast',
              event: 'offer',
              payload: { offer, to: payload.username, from: profileData?.username },
            });
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Announce presence so the other player knows to initiate
            signalingChannel.send({
              type: 'broadcast',
              event: 'peer-joined',
              payload: { username: profileData?.username },
            });

            // If player 2, also trigger player 1 to send offer by announcing again after short delay
            if (!isPlayer1) {
              setConnectionStatus('Waiting for opponent camera...');
            }
          }
        });

    } catch (err) {
      alert('Could not access camera/microphone. Please check permissions.');
    }
  }

  function cleanupWebRTC() {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (signalingChannelRef.current) {
      supabase.removeChannel(signalingChannelRef.current);
      signalingChannelRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
  }

  function leaveVideo() {
    cleanupWebRTC();
    setLocalStream(null);
    setVideoJoined(false);
    setRemoteConnected(false);
    setMicOn(true);
    setCamOn(true);
    setConnectionStatus('');

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

  const isPlayer = user && (
    battle.player1_username === profile?.username ||
    battle.player2_username === profile?.username
  );

  const shareLink = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <main className={styles.main}>
      <div className={styles.layout}>

        {/* VIDEO STAGE */}
        <div className={styles.stage}>

          {/* Topic bar */}
          <div className={styles.topicBar}>
            <div className={styles.livePill}>
              <div className={styles.liveDot}></div>
              LIVE
            </div>
            <div className={styles.topicText}>"{battle.topic}"</div>
            <button className={styles.shareBtn} onClick={copyLink}>
              {copied ? '✓ Copied!' : '🔗 Share'}
            </button>
          </div>

          {/* Video stage */}
          {videoJoined ? (
            <div className={styles.videoStage}>
              {/* Remote video (opponent) — full background */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={styles.remoteVideo}
              />

              {/* Placeholder when remote not yet connected */}
              {!remoteConnected && (
                <div className={styles.remoteWaiting}>
                  <div className={styles.remoteWaitingIcon}>⏳</div>
                  <div className={styles.remoteWaitingText}>
                    {connectionStatus || 'Waiting for opponent to join...'}
                  </div>
                </div>
              )}

              {/* Local video (picture-in-picture) */}
              <video
                ref={el => {
                  localVideoRef.current = el;
                  if (el && localStreamRef.current) el.srcObject = localStreamRef.current;
                }}
                autoPlay
                muted
                playsInline
                className={styles.localVideo}
              />

              {/* Connection status badge */}
              {connectionStatus && remoteConnected && (
                <div className={styles.connectionBadge}>🟢 {connectionStatus}</div>
              )}

              <div className={styles.videoControls}>
                <button
                  className={`${styles.controlBtn} ${micOn ? '' : styles.controlBtnOff}`}
                  onClick={() => {
                    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !micOn; });
                    setMicOn(m => !m);
                  }}
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
                <button
                  className={`${styles.controlBtn} ${styles.controlBtnLeave}`}
                  onClick={leaveVideo}
                >
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

            {!voted && user && !isPlayer && (
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

            {isPlayer && (
              <div className={styles.playerNotice}>You're in this battle — you can't vote on your own debate</div>
            )}

            {!user && (
              <div className={styles.loginPrompt}>
                <Link href="/login" className={styles.loginLink}>Sign in</Link> to vote
              </div>
            )}
          </div>

          {/* Waiting card */}
          {(battle.status === 'waiting' || !battle.player2_username) && (
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
            {messages.length === 0 && (
              <div className={styles.chatEmpty}>No messages yet. Say something!</div>
            )}
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
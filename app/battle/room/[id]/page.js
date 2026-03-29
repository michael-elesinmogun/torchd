'use client';
import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../supabase';
import styles from './room.module.css';

export default function BattleRoom({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const iframeRef = useRef(null);

  const [battle, setBattle] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [votes, setVotes] = useState({ player1: 0, player2: 0 });
  const [voted, setVoted] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([]);

  const [copied, setCopied] = useState(false);
  const [viewers, setViewers] = useState(0);
  const [videoJoined, setVideoJoined] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

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
      }

      // Fetch battle
      const { data: battleData } = await supabase
        .from('battles')
        .select('*')
        .eq('id', id)
        .single();

      if (!battleData) { router.push('/battle'); return; }
      setBattle(battleData);

      // Load votes
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

      // Check if user already voted
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

      // Real-time vote updates
      const channel = supabase
        .channel(`battle-room-${id}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'votes',
          filter: `battle_id=eq.${id}`,
        }, () => loadVotes())
        .subscribe();

      return () => supabase.removeChannel(channel);
    }

    init();
  }, [id]);

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

  async function joinVideo() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      setVideoJoined(true);
    } catch (err) {
      alert('Could not access camera/microphone. Please check permissions.');
    }
  }

  function leaveVideo() {
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      setLocalStream(null);
    }
    setVideoJoined(false);
    setMicOn(true);
    setCamOn(true);
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function sendChat() {
    if (!chatInput.trim()) return;
    setMessages(prev => [...prev, {
      name: profile?.username || 'You',
      text: chatInput,
      isMe: true,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    }]);
    setChatInput('');
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

          {/* Daily.co iframe */}
          {videoJoined ? (
            <div className={styles.videoStage}>
              <video
                ref={el => {
                  localVideoRef.current = el;
                  if (el && localStream) el.srcObject = localStream;
                }}
                autoPlay
                muted
                playsInline
                className={styles.localVideo}
              />
              {remoteStream && (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className={styles.remoteVideo}
                />
              )}
              <div className={styles.videoControls}>
                <button
                  className={`${styles.controlBtn} ${micOn ? '' : styles.controlBtnOff}`}
                  onClick={() => {
                    localStream?.getAudioTracks().forEach(t => { t.enabled = !micOn; });
                    setMicOn(m => !m);
                  }}
                >
                  {micOn ? '🎤' : '🔇'}
                </button>
                <button
                  className={`${styles.controlBtn} ${camOn ? '' : styles.controlBtnOff}`}
                  onClick={() => {
                    localStream?.getVideoTracks().forEach(t => { t.enabled = !camOn; });
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

          {/* Share section */}
          {battle.status === 'waiting' || !battle.player2_username ? (
            <div className={styles.waitingCard}>
              <div className={styles.waitingTitle}>⏳ Waiting for opponent</div>
              <p className={styles.waitingSub}>Share this link to invite someone to debate you:</p>
              <div className={styles.linkBox}>
                <div className={styles.linkUrl}>{shareLink}</div>
                <button className={styles.copyBtn} onClick={copyLink}>{copied ? '✓' : '📋'}</button>
              </div>
            </div>
          ) : null}

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
'use client';
import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../supabase';
import styles from './gameroom.module.css';

function getStatusLabel(status) {
  if (status.type === 'STATUS_IN_PROGRESS') return status.detail || status.clock || 'LIVE';
  if (status.type === 'STATUS_FINAL') return 'Final';
  const date = new Date(status.detail || '');
  return isNaN(date) ? 'Upcoming' : date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function isLive(status) {
  return status.type === 'STATUS_IN_PROGRESS';
}

export default function GameRoom({ params }) {
  const { gameId } = use(params);
  const sport = gameId?.split('-')[0] || 'nba';
  const espnId = gameId?.split('-').slice(1).join('-') || gameId;

  const router = useRouter();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const [game, setGame] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [onlineCount, setOnlineCount] = useState(1);
  const [roomUrl, setRoomUrl] = useState(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);

  // Fetch game score
  async function fetchGame() {
    try {
      const res = await fetch(`/api/scores?sport=${sport}`);
      const data = await res.json();
      const found = data.games?.find(g => g.id === espnId);
      if (found) setGame(found);
    } catch (e) {}
  }

  async function joinCamera() {
    if (roomUrl) { setCameraOn(true); return; }
    setCreatingRoom(true);
    try {
      const res = await fetch('/api/create-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ battleId: `game-${gameId}`, topic: game?.gameName || gameId }),
      });
      const data = await res.json();
      if (data.url) { setRoomUrl(data.url); setCameraOn(true); }
    } catch (e) { console.error(e); }
    setCreatingRoom(false);
  }

  useEffect(() => {
    if (!gameId) return;
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

      await fetchGame();

      // Load existing messages
      const { data: existingMessages } = await supabase
        .from('game_chats')
        .select('*')
        .eq('game_id', gameId)
        .order('created_at', { ascending: true })
        .limit(100);

      setMessages(existingMessages || []);
      setLoading(false);

      // Subscribe to new messages
      const channel = supabase
        .channel(`game-chat-${gameId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'game_chats',
          filter: `game_id=eq.${gameId}`,
        }, payload => {
          setMessages(prev => [...prev, payload.new]);
        })
        .subscribe();

      return () => supabase.removeChannel(channel);
    }

    init();

    // Refresh score every 30s
    const scoreInterval = setInterval(fetchGame, 30000);
    return () => clearInterval(scoreInterval);
  }, [gameId]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    if (!chatInput.trim() || !user || sending) return;
    setSending(true);

    const message = chatInput.trim();
    setChatInput('');

    const { error } = await supabase.from('game_chats').insert({
      game_id: gameId,
      user_id: user.id,
      username: profile?.username || user.email?.split('@')[0],
      message,
    });

    if (error) console.error('Chat error:', error.message);
    setSending(false);
  }

  function formatTime(dateStr) {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  const live = game && isLive(game.status);

  return (
    <main className={styles.main}>

      {/* Score header */}
      <div className={styles.scoreHeader}>
        <Link href="/lobby" className={styles.backBtn}>← Game Lobby</Link>

        {game ? (
          <div className={styles.scoreBoard}>
            <div className={styles.teamBlock}>
              {game.away.logo && <img src={game.away.logo} alt={game.away.abbr} className={styles.teamLogo} />}
              <div className={styles.teamAbbr}>{game.away.abbr}</div>
              {(live || game.status.type === 'STATUS_FINAL') && (
                <div className={`${styles.score} ${game.away.score > game.home.score ? styles.scoreLeading : ''}`}>
                  {game.away.score}
                </div>
              )}
            </div>

            <div className={styles.gameInfo}>
              <div className={`${styles.gameStatus} ${live ? styles.gameStatusLive : ''}`}>
                {live && <span className={styles.liveDot}></span>}
                {getStatusLabel(game.status)}
              </div>
              <div className={styles.gameName}>{game.away.abbr} vs {game.home.abbr}</div>
              {game.broadcast && <div className={styles.gameBroadcast}>{game.broadcast}</div>}
            </div>

            <div className={styles.teamBlock}>
              {game.home.logo && <img src={game.home.logo} alt={game.home.abbr} className={styles.teamLogo} />}
              <div className={styles.teamAbbr}>{game.home.abbr}</div>
              {(live || game.status.type === 'STATUS_FINAL') && (
                <div className={`${styles.score} ${game.home.score > game.away.score ? styles.scoreLeading : ''}`}>
                  {game.home.score}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.scoreBoardLoading}>Loading game...</div>
        )}

        <Link href="/battle/start" className={styles.debateBtn}>⚔️ Start a debate about this game</Link>
      </div>

      {/* Camera section */}
      {cameraOn && roomUrl ? (
        <div className={styles.cameraWrap}>
          <div className={styles.cameraHeader}>
            <span>📹 Live camera room</span>
            <button className={styles.leaveCameraBtn} onClick={() => setCameraOn(false)}>Leave camera</button>
          </div>
          <iframe
            src={roomUrl}
            className={styles.cameraFrame}
            allow="camera; microphone; fullscreen; display-capture"
            title="Game Room Camera"
          />
        </div>
      ) : (
        <div className={styles.cameraBar}>
          <div className={styles.cameraBarText}>
            📹 Want to react on camera? Join the live room with other fans.
          </div>
          {user ? (
            <button className={styles.joinCameraBtn} onClick={joinCamera} disabled={creatingRoom}>
              {creatingRoom ? 'Setting up...' : '🎥 Join on camera'}
            </button>
          ) : (
            <Link href="/login" className={styles.joinCameraBtn}>Sign in to join camera</Link>
          )}
        </div>
      )}

      {/* Chat area */}
      <div className={styles.chatWrap}>
        <div className={styles.chatHeader}>
          <div className={styles.chatTitle}>
            {game ? `${game.away.abbr} vs ${game.home.abbr} — Live Chat` : 'Live Chat'}
          </div>
          <div className={styles.chatOnline}>
            <span className={styles.onlineDot}></span>
            {onlineCount} watching
          </div>
        </div>

        <div className={styles.messages}>
          {loading ? (
            <div className={styles.chatLoading}>Loading chat...</div>
          ) : messages.length === 0 ? (
            <div className={styles.chatEmpty}>
              <div className={styles.chatEmptyIcon}>💬</div>
              <div className={styles.chatEmptyTitle}>Be the first to say something!</div>
              <p className={styles.chatEmptySub}>Chat with other fans watching this game.</p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isMe = user && msg.user_id === user.id;
              const showUsername = i === 0 || messages[i - 1]?.username !== msg.username;
              return (
                <div key={msg.id} className={`${styles.message} ${isMe ? styles.messageMe : ''}`}>
                  {showUsername && !isMe && (
                    <div className={styles.messageUsername}>@{msg.username}</div>
                  )}
                  <div className={styles.messageBubble}>
                    {msg.message}
                  </div>
                  {showUsername && (
                    <div className={styles.messageTime}>{formatTime(msg.created_at)}</div>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className={styles.inputRow}>
          {user ? (
            <>
              <input
                ref={inputRef}
                className={styles.input}
                placeholder="Say something about the game..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                maxLength={300}
              />
              <button className={styles.sendBtn} onClick={sendMessage} disabled={!chatInput.trim() || sending}>
                {sending ? '...' : '↑'}
              </button>
            </>
          ) : (
            <div className={styles.loginPrompt}>
              <Link href="/login" className={styles.loginLink}>Sign in</Link> to join the conversation
            </div>
          )}
        </div>
      </div>

    </main>
  );
}
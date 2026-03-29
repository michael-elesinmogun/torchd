'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '../../../supabase';
import styles from './gameroom.module.css';

function getStatusLabel(status) {
  if (status.type === 'STATUS_IN_PROGRESS') return status.detail || status.clock || 'LIVE';
  if (status.type === 'STATUS_HALFTIME') return 'Halftime';
  if (status.type === 'STATUS_END_PERIOD') return `End of ${status.detail || 'Period'}`;
  if (status.type === 'STATUS_FINAL') return 'Final';
  const date = new Date(status.detail || '');
  return isNaN(date) ? status.description || 'Upcoming' : date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function isLiveOrHalftime(status) {
  return ['STATUS_IN_PROGRESS', 'STATUS_HALFTIME', 'STATUS_END_PERIOD'].includes(status.type);
}

function isLive(status) {
  return ['STATUS_IN_PROGRESS', 'STATUS_HALFTIME', 'STATUS_END_PERIOD'].includes(status.type);
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default function GameRoom() {
  const params = useParams();
  const gameId = params?.gameId;
  const sport = gameId?.split('-')[0] || 'nba';
  const espnId = gameId?.split('-').slice(1).join('-') || gameId;

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const videoContainerRef = useRef(null);
  const dividerRef = useRef(null);

  const [game, setGame] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [onlineCount] = useState(1);
  const [roomUrl, setRoomUrl] = useState(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [plays, setPlays] = useState([]);
  const [gamcastLoading, setGamecastLoading] = useState(false);
  const [splitPct, setSplitPct] = useState(50);
  const [reactions, setReactions] = useState({}); // { msgId: { emoji: count } }
  const REACTION_EMOJIS = ['🔥','💀','😤','👑','🐐'];

  async function fetchGame() {
    if (!gameId) return;
    try {
      const res = await fetch(`/api/scores?sport=${sport}`);
      const data = await res.json();
      const found = data.games?.find(g => g.id === espnId);
      if (found) setGame(found);
    } catch (e) {}
  }

  async function fetchGamecast(isRefresh = false) {
    if (!gameId) return;
    if (!isRefresh) setGamecastLoading(true);
    try {
      const res = await fetch(`/api/gamecast?gameId=${espnId}&sport=${sport}`);
      const data = await res.json();
      if (data.plays) {
        if (!isRefresh) {
          setPlays(data.plays);
        } else {
          setPlays(prev => {
            const existingIds = new Set(prev.map(p => String(p.id)));
            const newPlays = data.plays.filter(p => !existingIds.has(String(p.id)));
            if (newPlays.length === 0) return prev;
            return [...newPlays, ...prev];
          });
        }
      }
    } catch (e) {}
    if (!isRefresh) setGamecastLoading(false);
  }

  function startDrag(e) {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    function onMove(e) {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const rect = container.getBoundingClientRect();
      const pct = Math.min(80, Math.max(20, ((clientX - rect.left) / rect.width) * 100));
      setSplitPct(pct);
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onUp);
  }

  function startVerticalDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    const wrapper = videoContainerRef.current;
    if (!wrapper) return;
    const startY = e.touches ? e.touches[0].clientY : e.clientY;
    const startHeight = wrapper.offsetHeight;
    const maxHeight = window.innerHeight * 0.72;
    const minHeight = 150;
    function onMove(ev) {
      ev.preventDefault();
      const clientY = ev.touches ? ev.touches[0].clientY : ev.clientY;
      const newHeight = Math.min(maxHeight, Math.max(minHeight, startHeight + (clientY - startY)));
      wrapper.style.height = newHeight + 'px';
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    }
    window.addEventListener('mousemove', onMove, { passive: false });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
  }

  async function joinCamera() {
    if (roomUrl) { setCameraOn(true); return; }
    setCreatingRoom(true);
    try {
      const res = await fetch('/api/create-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ battleId: `game-${gameId}`, topic: gameId }),
      });
      const data = await res.json();
      if (data.url) { setRoomUrl(data.url); setCameraOn(true); }
    } catch (e) {}
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
          .from('profiles').select('username, full_name')
          .eq('id', currentUser.id).single();
        setProfile(profileData);
      }
      await fetchGame();
      const { data: existingMessages } = await supabase
        .from('game_chats').select('*')
        .eq('game_id', gameId)
        .order('created_at', { ascending: true })
        .limit(100);
      setMessages(existingMessages || []);
      setLoading(false);
      const channel = supabase
        .channel(`game-chat-${gameId}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'game_chats',
          filter: `game_id=eq.${gameId}`,
        }, payload => {
          setMessages(prev => [...prev, payload.new]);
        })
        .subscribe();
      return () => supabase.removeChannel(channel);
    }
    init();
    fetchGamecast();
    const interval = setInterval(() => { fetchGame(); fetchGamecast(true); }, 30000);
    return () => clearInterval(interval);
  }, [gameId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function toggleReaction(msgId, emoji) {
    setReactions(prev => {
      const msgReactions = { ...(prev[msgId] || {}) };
      msgReactions[emoji] = (msgReactions[emoji] || 0) + 1;
      return { ...prev, [msgId]: msgReactions };
    });
  }

  async function sendMessage() {
    if (!chatInput.trim() || !user || sending) return;
    setSending(true);
    const message = chatInput.trim();
    setChatInput('');
    await supabase.from('game_chats').insert({
      game_id: gameId,
      user_id: user.id,
      username: profile?.username || user.email?.split('@')[0],
      message,
    });
    setSending(false);
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
                <div className={`${styles.score} ${game.away.score > game.home.score ? styles.scoreLeading : ''}`}>{game.away.score}</div>
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
                <div className={`${styles.score} ${game.home.score > game.away.score ? styles.scoreLeading : ''}`}>{game.home.score}</div>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.scoreBoardLoading}>Loading game...</div>
        )}
        <Link href="/battle/start" className={styles.debateBtn}>⚔️ Start a debate</Link>
      </div>

      {/* Camera */}
      {cameraOn && roomUrl ? (
        <div className={styles.cameraWrap} ref={videoContainerRef} style={{height: '40vh'}}>
          <div className={styles.cameraHeader}>
            <span>📹 Live camera room</span>
            <button className={styles.leaveCameraBtn} onClick={() => setCameraOn(false)}>Leave camera</button>
          </div>
          <iframe src={roomUrl} className={styles.cameraFrame} allow="camera; microphone; fullscreen; display-capture" title="Game Room Camera" />
          <div className={styles.verticalDivider} onMouseDown={startVerticalDrag} onTouchStart={startVerticalDrag}>
            <div className={styles.verticalDividerHandle}></div>
          </div>
        </div>
      ) : (
        <div className={styles.cameraBar}>
          <div className={styles.cameraBarText}>📹 Want to react on camera? Join the live room with other fans.</div>
          {user ? (
            <button className={styles.joinCameraBtn} onClick={joinCamera} disabled={creatingRoom}>
              {creatingRoom ? 'Setting up...' : '🎥 Join on camera'}
            </button>
          ) : (
            <Link href="/login" className={styles.joinCameraBtn}>Sign in to join camera</Link>
          )}
        </div>
      )}

      {/* Main two-column layout */}
      <div className={styles.mainContent} ref={containerRef}>

        {/* Play-by-play */}
        <div className={styles.gamecastCol} style={{width: `${splitPct}%`}}>
          <div className={styles.colHeader}>📊 Play-by-Play</div>
          <div className={styles.gamecastWrap}>
            {gamcastLoading ? (
              <div className={styles.chatLoading}>Loading...</div>
            ) : plays.length === 0 ? (
              <div className={styles.chatEmpty}>
                <div className={styles.chatEmptyIcon}>📊</div>
                <div className={styles.chatEmptyTitle}>No plays yet</div>
                <p className={styles.chatEmptySub}>Play-by-play appears here during the game.</p>
              </div>
            ) : plays.map((play, i) => (
              <div
                key={play.id || i}
                className={`${styles.play} ${play.scoringPlay ? styles.playScoring : ''}`}
                style={{ animationDelay: `${Math.min(i, 10) * 80}ms` }}
              >
                <div className={styles.playClock}>{play.clock} {play.periodText}</div>
                <div className={styles.playText}>{play.text}</div>
                {play.scoringPlay && (
                  <div className={styles.playScore}>{play.awayScore} – {play.homeScore}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Horizontal drag divider */}
        <div className={styles.divider} onMouseDown={startDrag} onTouchStart={startDrag} ref={dividerRef}>
          <div className={styles.dividerHandle}></div>
        </div>

        {/* Chat */}
        <div className={styles.chatWrap} style={{width: `${100 - splitPct}%`}}>
          <div className={styles.chatHeader}>
            <div className={styles.colHeader}>
              {game ? (
                <span style={{display:'flex',alignItems:'center',gap:'6px'}}>
                  {game.away.logo && <img src={game.away.logo} style={{width:'18px',height:'18px',objectFit:'contain'}} alt={game.away.abbr} />}
                  <span>{game.away.abbr}</span>
                  <span style={{color:'#3D4A66',fontSize:'11px'}}>vs</span>
                  <span>{game.home.abbr}</span>
                  {game.home.logo && <img src={game.home.logo} style={{width:'18px',height:'18px',objectFit:'contain'}} alt={game.home.abbr} />}
                  <span style={{color:'#6B7A9E',fontFamily:'DM Sans',fontSize:'12px',fontWeight:400,marginLeft:'4px'}}>Live Chat</span>
                </span>
              ) : '💬 Live Chat'}
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
                <div className={styles.chatEmptyIcon}>{game ? `${game.away.abbr} 🆚 ${game.home.abbr}` : '💬'}</div>
                <div className={styles.chatEmptyTitle}>Be the first to react!</div>
                <p className={styles.chatEmptySub}>{game ? `Chat with other ${game.away.abbr} and ${game.home.abbr} fans watching live.` : 'Chat with other fans.'}</p>
              </div>
            ) : messages.map((msg) => {
              const isMe = user && msg.user_id === user.id;
              const avatarColor = `hsl(${(msg.username?.charCodeAt(0) || 0) * 10 % 360}, 60%, 45%)`;
              const msgReactions = reactions[msg.id] || {};
              return (
                <ChatMessage
                  key={msg.id}
                  msg={msg}
                  isMe={isMe}
                  avatarColor={avatarColor}
                  msgReactions={msgReactions}
                  toggleReaction={toggleReaction}
                  user={user}
                  REACTION_EMOJIS={REACTION_EMOJIS}
                  styles={styles}
                  formatTime={formatTime}
                />
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {user && (
            <div className={styles.reactionsBar}>
              {['🔥','😤','💀','🐐','😱','👑','🏀','💯'].map(emoji => (
                <button key={emoji} className={styles.reactionBtn} onClick={() => {
                  setChatInput(prev => prev + emoji);
                  inputRef.current?.focus();
                }}>{emoji}</button>
              ))}
            </div>
          )}

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

      </div>
    </main>
  );
}

function ChatMessage({ msg, isMe, avatarColor, msgReactions, toggleReaction, user, REACTION_EMOJIS, styles, formatTime }) {
  const [showPicker, setShowPicker] = useState(false);
  return (
    <div className={styles.chatRow}>
      <div className={styles.messageAvatar} style={{background: avatarColor}}>
        {msg.username?.slice(0,1).toUpperCase()}
      </div>
      <div className={styles.messageBody}>
        <div className={styles.messageUsername} style={{color: isMe ? '#60A5FA' : avatarColor}}>
          @{msg.username}{isMe ? ' (you)' : ''}
        </div>
        <div className={styles.messageBubble}>{msg.message}</div>
        {Object.keys(msgReactions).length > 0 && (
          <div className={styles.msgReactions}>
            {Object.entries(msgReactions).map(([emoji, count]) => (
              <button key={emoji} className={styles.msgReaction} onClick={() => toggleReaction(msg.id, emoji)}>
                {emoji} <span className={styles.msgReactionCount}>{count}</span>
              </button>
            ))}
          </div>
        )}
        <div className={styles.messageTime}>{formatTime(msg.created_at)}</div>
      </div>
      {user && (
        <div style={{position:'relative',flexShrink:0}}>
          <button className={styles.msgReactBtn} onClick={() => setShowPicker(p => !p)}>😊</button>
          {showPicker && (
            <div style={{position:'absolute',right:0,top:'100%',background:'#1c2840',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'6px',display:'flex',gap:'4px',zIndex:10}}>
              {REACTION_EMOJIS.map(e => (
                <button key={e} style={{background:'none',border:'none',cursor:'pointer',fontSize:'18px',padding:'2px'}}
                  onClick={() => { toggleReaction(msg.id, e); setShowPicker(false); }}>
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '../../../supabase';
import styles from './gameroom.module.css';

function getStatusLabel(status) {
  if (status.type === 'STATUS_IN_PROGRESS') return status.detail || status.clock || 'LIVE';
  if (status.type === 'STATUS_HALFTIME') return 'Halftime';
  if (status.type === 'STATUS_END_PERIOD') return status.detail || 'End of Period';
  if (status.type === 'STATUS_FINAL') return 'Final';
  const date = new Date(status.detail || '');
  return isNaN(date) ? status.description || 'Upcoming' : date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function isLive(status) {
  return ['STATUS_IN_PROGRESS', 'STATUS_HALFTIME', 'STATUS_END_PERIOD'].includes(status.type);
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function getPeriodLabel(sport, p) {
  if (p === 'all') return 'All';
  const n = Number(p);
  if (sport === 'mlb') return `Inn ${n}`;
  if (sport === 'nhl') return n <= 3 ? `P${n}` : `OT${n - 3}`;
  if (sport === 'nba' || sport === 'wnba') return n <= 4 ? `Q${n}` : `OT${n - 4}`;
  if (sport === 'nfl' || sport === 'ncaafb') return n <= 4 ? `Q${n}` : `OT${n - 4}`;
  return n <= 4 ? `Q${n}` : `OT${n - 4}`;
}

function getSportEmoji(sport) {
  if (sport === 'mlb') return '⚾';
  if (sport === 'nhl') return '🏒';
  if (sport === 'nfl' || sport === 'ncaafb') return '🏈';
  return '🏀';
}

export default function GameRoom() {
  const params = useParams();
  const gameId = params?.gameId;
  const sport = gameId?.split('-')[0] || 'nba';
  const espnId = gameId?.split('-').slice(1).join('-') || gameId;

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const [game, setGame] = useState(null);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [onlineCount] = useState(1);
  const [plays, setPlays] = useState([]);
  const [gamcastLoading, setGamecastLoading] = useState(false);
  const [activePeriod, setActivePeriod] = useState('all');
  const [activeStatsTab, setActiveStatsTab] = useState('chat');
  const [teamStats, setTeamStats] = useState([]);
  const [players, setPlayers] = useState([]);
  const [splitPct, setSplitPct] = useState(50);
  const [reactions, setReactions] = useState({});
  const REACTION_EMOJIS = ['🔥','💀','😤','👑','🐐'];

  // LiveKit watch party
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [remoteTracks, setRemoteTracks] = useState([]);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamEnabled, setIsCamEnabled] = useState(true);
  const liveKitRoomRef = useRef(null);
  const localVideoRef = useRef(null);
  const localTrackRef = useRef(null);
  const audioElementsRef = useRef({});
  const liveKitRoomObjectRef = useRef(null);
  const isCamEnabledRef = useRef(true);

  function attachLocalVideo(track) {
    if (!track?.mediaStreamTrack || !localVideoRef.current) return;
    if (!isCamEnabledRef.current) return;
    try {
      localTrackRef.current = track;
      localVideoRef.current.srcObject = new MediaStream([track.mediaStreamTrack]);
      localVideoRef.current.style.display = 'block';
    } catch (e) {}
  }

  useEffect(() => {
    if (!cameraOn) return;
    const tryAttach = () => {
      const { room, Track } = liveKitRoomObjectRef.current || {};
      if (!room || !Track) return;
      const camPub = room.localParticipant.getTrackPublication(Track.Source.Camera);
      if (camPub?.track) attachLocalVideo(camPub.track);
    };
    tryAttach();
    const t1 = setTimeout(tryAttach, 200);
    const t2 = setTimeout(tryAttach, 700);
    const t3 = setTimeout(tryAttach, 1500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [cameraOn]);

  async function joinCamera() {
    if (!user) return;
    setCameraError('');
    setCreatingRoom(true);
    try {
      const roomNameForGame = `torchd-game-${gameId}`.replace(/[^a-zA-Z0-9-]/g, '-').slice(0, 60);
      const tokenRes = await fetch('/api/livekit-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: roomNameForGame,
          participantName: profile?.username || `fan-${Date.now()}`,
          canPublish: true,
        }),
      });
      const { token, error: tokenError } = await tokenRes.json();
      if (tokenError) throw new Error(tokenError);

      const { Room, RoomEvent, Track } = await import('livekit-client');
      if (liveKitRoomRef.current) {
        try { await liveKitRoomRef.current.disconnect(); } catch {}
      }
      const room = new Room({ adaptiveStream: true, dynacast: true });
      liveKitRoomRef.current = room;
      liveKitRoomObjectRef.current = { room, Track };

      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (track.kind === Track.Kind.Video) {
          setRemoteTracks(prev => [...prev, { track, participant }]);
        }
        if (track.kind === Track.Kind.Audio) {
          const audioEl = document.createElement('audio');
          audioEl.autoplay = true;
          audioEl.srcObject = new MediaStream([track.mediaStreamTrack]);
          audioEl.play().catch(() => {});
          audioElementsRef.current[track.sid] = audioEl;
          document.body.appendChild(audioEl);
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        if (track.kind === Track.Kind.Video) {
          setRemoteTracks(prev => prev.filter(t => t.track !== track));
        }
        if (track.kind === Track.Kind.Audio && audioElementsRef.current[track.sid]) {
          audioElementsRef.current[track.sid].remove();
          delete audioElementsRef.current[track.sid];
        }
      });

      room.on(RoomEvent.LocalTrackPublished, (publication) => {
        if (publication.source === Track.Source.Camera) {
          attachLocalVideo(publication.track);
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        setCameraOn(false);
        setRemoteTracks([]);
        localTrackRef.current = null;
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
        Object.values(audioElementsRef.current).forEach(el => el.remove());
        audioElementsRef.current = {};
      });

      await room.connect('wss://torchd-kub6j4c8.livekit.cloud', token);
      await room.localParticipant.setCameraEnabled(true);
      await room.localParticipant.setMicrophoneEnabled(true);
      isCamEnabledRef.current = true;
      setIsCamEnabled(true);
      setCameraOn(true);
    } catch (err) {
      console.error('Watch party join error:', err);
      setCameraError('Could not join: ' + err.message);
    }
    setCreatingRoom(false);
  }

  async function leaveCamera() {
    if (liveKitRoomRef.current) {
      try { await liveKitRoomRef.current.disconnect(); } catch {}
      liveKitRoomRef.current = null;
    }
    liveKitRoomObjectRef.current = null;
    setCameraOn(false);
    setRemoteTracks([]);
    localTrackRef.current = null;
    isCamEnabledRef.current = true;
    setIsCamEnabled(true);
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    Object.values(audioElementsRef.current).forEach(el => el.remove());
    audioElementsRef.current = {};
  }

  async function toggleMic() {
    if (!liveKitRoomRef.current) return;
    const enabled = !isMicOn;
    await liveKitRoomRef.current.localParticipant.setMicrophoneEnabled(enabled);
    setIsMicOn(enabled);
  }

  async function toggleCam() {
    if (!liveKitRoomRef.current) return;
    const { Track } = liveKitRoomObjectRef.current || {};
    const enabled = !isCamEnabled;
    isCamEnabledRef.current = enabled;
    setIsCamEnabled(enabled);
    await liveKitRoomRef.current.localParticipant.setCameraEnabled(enabled);
    if (!enabled) {
      if (localVideoRef.current) {
        localVideoRef.current.style.display = 'none';
        localVideoRef.current.srcObject = null;
      }
    } else if (Track) {
      const tryReattach = () => {
        const camPub = liveKitRoomRef.current?.localParticipant.getTrackPublication(Track.Source.Camera);
        if (camPub?.track?.mediaStreamTrack && localVideoRef.current) {
          localVideoRef.current.srcObject = new MediaStream([camPub.track.mediaStreamTrack]);
          localVideoRef.current.style.display = 'block';
        }
      };
      setTimeout(tryReattach, 300);
      setTimeout(tryReattach, 800);
      setTimeout(tryReattach, 1500);
    }
  }

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
      if (data.plays) setPlays(data.plays);
      if (data.teamStats) setTeamStats(data.teamStats);
      if (data.players) setPlayers(data.players);
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

  useEffect(() => {
    if (!gameId) return;
    async function init() {
      const profileLoadedRef_local = { current: false };

      supabase.auth.onAuthStateChange((_event, session) => {
        if (!profileLoadedRef_local.current) {
          profileLoadedRef_local.current = true;
          const currentUser = session?.user ?? null;
          setUser(currentUser);
          setAuthReady(true);
          if (currentUser) {
            supabase.from('profiles').select('username, full_name')
              .eq('id', currentUser.id).single()
              .then(({ data }) => setProfile(data));
          }
        }
      });

      setTimeout(() => {
        if (!profileLoadedRef_local.current) {
          profileLoadedRef_local.current = true;
          supabase.auth.getSession().then(({ data: { session } }) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            setAuthReady(true);
            if (currentUser) {
              supabase.from('profiles').select('username, full_name')
                .eq('id', currentUser.id).single()
                .then(({ data }) => setProfile(data));
            }
          });
        }
      }, 1000);

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
    return () => {
      clearInterval(interval);
      if (liveKitRoomRef.current) {
        try { liveKitRoomRef.current.disconnect(); } catch {}
      }
      Object.values(audioElementsRef.current).forEach(el => el.remove());
    };
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

  // The chat panel — shared between desktop sidebar and mobile tab
  const chatPanel = (
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
            {game ? (
              <div className={styles.chatEmptyLogos}>
                {game.away.logo && <img src={game.away.logo} alt={game.away.abbr} className={styles.chatEmptyLogo} />}
                <span className={styles.chatEmptyVs}>VS</span>
                {game.home.logo && <img src={game.home.logo} alt={game.home.abbr} className={styles.chatEmptyLogo} />}
              </div>
            ) : <div className={styles.chatEmptyIcon}>💬</div>}
            <div className={styles.chatEmptyTitle}>Be the first to react!</div>
            <p className={styles.chatEmptySub}>{game ? `Chat with other ${game.away.abbr} and ${game.home.abbr} fans watching live.` : 'Chat with other fans.'}</p>
          </div>
        ) : messages.map((msg) => {
          const isMe = user && msg.user_id === user.id;
          const avatarColor = `hsl(${(msg.username?.charCodeAt(0) || 0) * 10 % 360}, 60%, 45%)`;
          const msgReactions = reactions[msg.id] || {};
          return (
            <ChatMessage key={msg.id} msg={msg} isMe={isMe} avatarColor={avatarColor}
              msgReactions={msgReactions} toggleReaction={toggleReaction}
              user={user} REACTION_EMOJIS={REACTION_EMOJIS} styles={styles} formatTime={formatTime} />
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
        {!authReady ? null : user ? (
          <>
            <input ref={inputRef} className={styles.input}
              placeholder="Say something about the game..."
              value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              maxLength={300} />
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
  );

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
        <Link href="/battle/start" className={styles.debateBtn}>
          <span className={styles.debateBtnFull}>⚔️ Start a debate</span>
          <span className={styles.debateBtnShort}>Debate</span>
        </Link>
      </div>

      {/* Watch Party */}
      {cameraOn ? (
        <div style={{ background: '#060912', borderBottom: '1px solid rgba(255,255,255,0.065)', padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#EEF2FF', fontFamily: 'Syne,sans-serif' }}>📹 Watch Party</span>
              <span style={{ fontSize: '12px', color: '#6B7A9E' }}>{remoteTracks.length + 1} on camera</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={toggleMic} style={{ width: '34px', height: '34px', borderRadius: '50%', border: 'none', background: isMicOn ? 'rgba(255,255,255,0.1)' : 'rgba(239,68,68,0.4)', fontSize: '15px', cursor: 'pointer' }}>{isMicOn ? '🎤' : '🔇'}</button>
              <button onClick={toggleCam} style={{ width: '34px', height: '34px', borderRadius: '50%', border: 'none', background: isCamEnabled ? 'rgba(255,255,255,0.1)' : 'rgba(239,68,68,0.4)', fontSize: '15px', cursor: 'pointer' }}>{isCamEnabled ? '📹' : '🚫'}</button>
              <button onClick={leaveCamera} style={{ background: '#EF4444', border: 'none', borderRadius: '8px', padding: '6px 14px', color: 'white', fontSize: '13px', fontFamily: 'Syne,sans-serif', fontWeight: 700, cursor: 'pointer' }}>Leave</button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {isCamEnabled ? (
                <video ref={localVideoRef} autoPlay muted playsInline
                  style={{ width: '140px', height: '100px', objectFit: 'cover', borderRadius: '10px', background: '#111', border: '2px solid rgba(59,130,246,0.4)', transform: 'scaleX(-1)', display: 'none' }} />
              ) : (
                <div style={{ width: '140px', height: '100px', borderRadius: '10px', background: '#111', border: '2px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🚫</div>
              )}
              <div style={{ position: 'absolute', bottom: '4px', left: '6px', fontSize: '10px', color: 'white', background: 'rgba(0,0,0,0.6)', borderRadius: '4px', padding: '1px 5px' }}>You</div>
            </div>
            {remoteTracks.map(({ track, participant }) => (
              <RemoteVideoTile key={track.sid} track={track} name={participant.identity} />
            ))}
            {remoteTracks.length === 0 && (
              <div style={{ width: '140px', height: '100px', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', flexShrink: 0 }}>
                <div style={{ fontSize: '20px' }}>👥</div>
                <div style={{ fontSize: '11px', color: '#6B7A9E', textAlign: 'center' }}>Waiting for others</div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={styles.cameraBar}>
          <div className={styles.cameraBarText}>📹 Watch party — react on camera with other fans watching live.</div>
          {cameraError && <div style={{ fontSize: '12px', color: '#F87171', marginRight: '8px' }}>{cameraError}</div>}
          {!authReady ? null : user ? (
            <button className={styles.joinCameraBtn} onClick={joinCamera} disabled={creatingRoom}>
              {creatingRoom ? 'Setting up...' : '🎥 Join watch party'}
            </button>
          ) : (
            <Link href="/login" className={styles.joinCameraBtn}>Sign in to join</Link>
          )}
        </div>
      )}

      {/* MOBILE: single column with chat as a tab */}
      <div className={styles.mobileLayout}>
        <div className={styles.mainStatsTabs}>
          <button className={`${styles.mainStatsTab} ${activeStatsTab === 'chat' ? styles.mainStatsTabActive : ''}`} onClick={() => setActiveStatsTab('chat')}>💬 Chat</button>
          <button className={`${styles.mainStatsTab} ${activeStatsTab === 'plays' ? styles.mainStatsTabActive : ''}`} onClick={() => setActiveStatsTab('plays')}>▶ Plays</button>
          <button className={`${styles.mainStatsTab} ${activeStatsTab === 'team' ? styles.mainStatsTabActive : ''}`} onClick={() => setActiveStatsTab('team')}>📊 Team</button>
          <button className={`${styles.mainStatsTab} ${activeStatsTab === 'box' ? styles.mainStatsTabActive : ''}`} onClick={() => setActiveStatsTab('box')}>{getSportEmoji(sport)} Box</button>
        </div>

        {activeStatsTab === 'plays' && <>
          {plays.length > 0 && (() => {
            const periods = ['all', ...new Set(plays.map(p => p.period).filter(Boolean).sort((a,b) => a-b))];
            return (
              <div className={styles.periodTabs}>
                {periods.map(p => (
                  <button key={p} className={`${styles.periodTab} ${activePeriod === 'all' ? p === 'all' : Number(activePeriod) === Number(p) ? styles.periodTabActive : ''}`} onClick={() => setActivePeriod(p)}>
                    {getPeriodLabel(sport, p)}
                  </button>
                ))}
              </div>
            );
          })()}
          <div className={styles.mobileScrollPane}>
            {gamcastLoading ? (
              <div className={styles.chatLoading}>Loading...</div>
            ) : plays.length === 0 ? (
              <div className={styles.chatEmpty}>
                <div className={styles.chatEmptyIcon}>📊</div>
                <div className={styles.chatEmptyTitle}>No plays yet</div>
                <p className={styles.chatEmptySub}>Play-by-play appears here during the game.</p>
              </div>
            ) : plays.filter(p => activePeriod === 'all' || Number(p.period) === Number(activePeriod)).map((play, i) => {
              let scoringClass = '';
              if (play.scoringPlay) {
                const prevPlayCheck = plays[i + 1];
                const awayDiff = prevPlayCheck ? (play.awayScore - prevPlayCheck.awayScore) : 0;
                const homeDiff = prevPlayCheck ? (play.homeScore - prevPlayCheck.homeScore) : 0;
                if (awayDiff > 0) scoringClass = styles.playScoringAway;
                else if (homeDiff > 0) scoringClass = styles.playScoringHome;
                else scoringClass = styles.playScoring;
              }
              const awayColor = game?.away?.color ? `#${game.away.color}` : '#3B82F6';
              const homeColor = game?.home?.color ? `#${game.home.color}` : '#10B981';
              const prevPlay = plays[i + 1];
              let scoringLogo = null;
              if (play.scoringPlay && prevPlay) {
                if (play.awayScore > prevPlay.awayScore) scoringLogo = game?.away?.logo;
                else if (play.homeScore > prevPlay.homeScore) scoringLogo = game?.home?.logo;
              }
              return (
                <div key={play.id || i} className={`${styles.play} ${scoringClass}`}
                  style={{ animationDelay: `${Math.min(i, 10) * 80}ms`, '--away-color': awayColor, '--home-color': homeColor }}>
                  <div className={styles.playHeader}>
                    {scoringLogo && <img src={scoringLogo} alt="" className={styles.playTeamLogo} />}
                    <div className={styles.playClock}>{play.clock} {play.periodText}</div>
                  </div>
                  <div className={styles.playText}>{play.text}</div>
                  {play.scoringPlay && game && (
                    <div className={styles.playScore}>
                      <span className={styles.scoreTeamPill} style={{ background: `${awayColor}22`, border: `1px solid ${awayColor}55`, color: '#EEF2FF' }}>{game.away?.abbr} {play.awayScore}</span>
                      <span style={{color:'#3D4A66',margin:'0 4px'}}>–</span>
                      <span className={styles.scoreTeamPill} style={{ background: `${homeColor}22`, border: `1px solid ${homeColor}55`, color: '#EEF2FF' }}>{game.home?.abbr} {play.homeScore}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>}

        {activeStatsTab === 'team' && (
          <div className={styles.mobileScrollPane}>
            {teamStats.length === 0 ? <div className={styles.chatLoading}>Loading team stats...</div>
            : teamStats.map(team => (
              <div key={team.team} className={styles.teamStatsBlock}>
                <div className={styles.teamStatsHeader}>
                  {team.logo && <img src={team.logo} alt={team.team} className={styles.teamStatsLogo} />}
                  <span className={styles.teamStatsName}>{team.name}</span>
                </div>
                <div className={styles.teamStatsGrid}>
                  {team.statistics?.filter(s => ['FG','3PT','FT','REB','AST','TO','STL','BLK','PTS','R','H','E','LOB','HR','BB','SO'].includes(s.abbreviation)).map(stat => (
                    <div key={stat.name} className={styles.teamStatItem}>
                      <div className={styles.teamStatValue}>{stat.displayValue}</div>
                      <div className={styles.teamStatLabel}>{stat.abbreviation || stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeStatsTab === 'box' && (
          <div className={styles.mobileScrollPane}>
            {players.length === 0 ? <div className={styles.chatLoading}>Loading box score...</div>
            : players.map(teamPlayers => {
              const statGroup = teamPlayers.statistics?.[0];
              if (!statGroup) return null;
              const labels = statGroup.labels || [];
              const keyStats = sport === 'mlb'
                ? ['AB','R','H','RBI','BB','SO','AVG']
                : sport === 'nhl'
                ? ['G','A','PTS','+/-','PIM','SOG']
                : sport === 'nfl' || sport === 'ncaafb'
                ? ['C/ATT','YDS','TD','INT','SACKS']
                : ['MIN','PTS','REB','AST','STL','BLK','FG','3PT','TO'];
              const keyIndices = keyStats.map(k => labels.indexOf(k)).filter(i => i >= 0);
              const finalIndices = keyIndices.length > 0 ? keyIndices : labels.map((_, i) => i).slice(0, 8);
              const displayLabels = finalIndices.map(i => labels[i]);
              return (
                <div key={teamPlayers.team} className={styles.boxScoreBlock}>
                  <div className={styles.teamStatsHeader}>
                    {teamPlayers.teamLogo && <img src={teamPlayers.teamLogo} alt={teamPlayers.team} className={styles.teamStatsLogo} />}
                    <span className={styles.teamStatsName}>{teamPlayers.teamName}</span>
                  </div>
                  <div className={styles.boxScoreTable}>
                    <div className={styles.boxScoreRow + ' ' + styles.boxScoreHeader}>
                      <div className={styles.boxScorePlayer}>PLAYER</div>
                      {displayLabels.map(l => <div key={l} className={styles.boxScoreStat}>{l}</div>)}
                    </div>
                    {statGroup.athletes?.map(athlete => (
                      <div key={athlete.id} className={`${styles.boxScoreRow} ${athlete.starter ? styles.boxScoreStarter : ''} ${athlete.didNotPlay ? styles.boxScoreDNP : ''}`}>
                        <div className={styles.boxScorePlayer}>
                          <span className={styles.boxScoreJersey}>{athlete.jersey}</span>
                          <span className={styles.boxScoreName}>{athlete.shortName}</span>
                          <span className={styles.boxScorePos}>{athlete.position}</span>
                        </div>
                        {athlete.didNotPlay ? (
                          <div className={styles.boxScoreDNPLabel} style={{flex:4,textAlign:'left',paddingLeft:'4px'}}>{athlete.reason || 'DNP'}</div>
                        ) : finalIndices.map((ki, idx) => (
                          <div key={idx} className={styles.boxScoreStat}>{athlete.stats?.[ki] || '—'}</div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeStatsTab === 'chat' && (
          <div className={styles.mobileChatPane}>
            {chatPanel}
          </div>
        )}
      </div>

      {/* DESKTOP: side-by-side split layout */}
      <div className={styles.mainContent} ref={containerRef}>
        <div className={styles.gamecastCol} style={{width: `${splitPct}%`}}>
          <div className={styles.mainStatsTabs}>
            <button className={`${styles.mainStatsTab} ${activeStatsTab === 'plays' ? styles.mainStatsTabActive : ''}`} onClick={() => setActiveStatsTab('plays')}>▶ Plays</button>
            <button className={`${styles.mainStatsTab} ${activeStatsTab === 'team' ? styles.mainStatsTabActive : ''}`} onClick={() => setActiveStatsTab('team')}>📊 Team</button>
            <button className={`${styles.mainStatsTab} ${activeStatsTab === 'box' ? styles.mainStatsTabActive : ''}`} onClick={() => setActiveStatsTab('box')}>{getSportEmoji(sport)} Box</button>
          </div>

          {activeStatsTab === 'plays' && <>
            {plays.length > 0 && (() => {
              const periods = ['all', ...new Set(plays.map(p => p.period).filter(Boolean).sort((a,b) => a-b))];
              return (
                <div className={styles.periodTabs}>
                  {periods.map(p => (
                    <button key={p} className={`${styles.periodTab} ${activePeriod === 'all' ? p === 'all' : Number(activePeriod) === Number(p) ? styles.periodTabActive : ''}`} onClick={() => setActivePeriod(p)}>
                      {getPeriodLabel(sport, p)}
                    </button>
                  ))}
                </div>
              );
            })()}
          </>}

          {activeStatsTab === 'plays' && <div className={styles.gamecastWrap}>
            {gamcastLoading ? (
              <div className={styles.chatLoading}>Loading...</div>
            ) : plays.length === 0 ? (
              <div className={styles.chatEmpty}>
                <div className={styles.chatEmptyIcon}>📊</div>
                <div className={styles.chatEmptyTitle}>No plays yet</div>
                <p className={styles.chatEmptySub}>Play-by-play appears here during the game.</p>
              </div>
            ) : plays.filter(p => activePeriod === 'all' || Number(p.period) === Number(activePeriod)).map((play, i) => {
              let scoringClass = '';
              if (play.scoringPlay) {
                const prevPlayCheck = plays[i + 1];
                const awayDiff = prevPlayCheck ? (play.awayScore - prevPlayCheck.awayScore) : 0;
                const homeDiff = prevPlayCheck ? (play.homeScore - prevPlayCheck.homeScore) : 0;
                if (awayDiff > 0) scoringClass = styles.playScoringAway;
                else if (homeDiff > 0) scoringClass = styles.playScoringHome;
                else scoringClass = styles.playScoring;
              }
              const awayColor = game?.away?.color ? `#${game.away.color}` : '#3B82F6';
              const homeColor = game?.home?.color ? `#${game.home.color}` : '#10B981';
              const prevPlay = plays[i + 1];
              let scoringLogo = null;
              if (play.scoringPlay && prevPlay) {
                if (play.awayScore > prevPlay.awayScore) scoringLogo = game?.away?.logo;
                else if (play.homeScore > prevPlay.homeScore) scoringLogo = game?.home?.logo;
              }
              return (
                <div key={play.id || i} className={`${styles.play} ${scoringClass}`}
                  style={{ animationDelay: `${Math.min(i, 10) * 80}ms`, '--away-color': awayColor, '--home-color': homeColor }}>
                  <div className={styles.playHeader}>
                    {scoringLogo && <img src={scoringLogo} alt="" className={styles.playTeamLogo} />}
                    <div className={styles.playClock}>{play.clock} {play.periodText}</div>
                  </div>
                  <div className={styles.playText}>{play.text}</div>
                  {play.scoringPlay && game && (
                    <div className={styles.playScore}>
                      <span className={styles.scoreTeamPill} style={{ background: `${awayColor}22`, border: `1px solid ${awayColor}55`, color: '#EEF2FF' }}>{game.away?.abbr} {play.awayScore}</span>
                      <span style={{color:'#3D4A66',margin:'0 4px'}}>–</span>
                      <span className={styles.scoreTeamPill} style={{ background: `${homeColor}22`, border: `1px solid ${homeColor}55`, color: '#EEF2FF' }}>{game.home?.abbr} {play.homeScore}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>}

          {activeStatsTab === 'team' && (
            <div className={styles.gamecastWrap}>
              {teamStats.length === 0 ? <div className={styles.chatLoading}>Loading team stats...</div>
              : teamStats.map(team => (
                <div key={team.team} className={styles.teamStatsBlock}>
                  <div className={styles.teamStatsHeader}>
                    {team.logo && <img src={team.logo} alt={team.team} className={styles.teamStatsLogo} />}
                    <span className={styles.teamStatsName}>{team.name}</span>
                  </div>
                  <div className={styles.teamStatsGrid}>
                    {team.statistics?.filter(s => ['FG','3PT','FT','REB','AST','TO','STL','BLK','PTS','R','H','E','LOB','HR','BB','SO'].includes(s.abbreviation)).map(stat => (
                      <div key={stat.name} className={styles.teamStatItem}>
                        <div className={styles.teamStatValue}>{stat.displayValue}</div>
                        <div className={styles.teamStatLabel}>{stat.abbreviation || stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeStatsTab === 'box' && (
            <div className={styles.gamecastWrap}>
              {players.length === 0 ? <div className={styles.chatLoading}>Loading box score...</div>
              : players.map(teamPlayers => {
                const statGroup = teamPlayers.statistics?.[0];
                if (!statGroup) return null;
                const labels = statGroup.labels || [];
                const keyStats = sport === 'mlb'
                  ? ['AB','R','H','RBI','BB','SO','AVG']
                  : sport === 'nhl'
                  ? ['G','A','PTS','+/-','PIM','SOG']
                  : sport === 'nfl' || sport === 'ncaafb'
                  ? ['C/ATT','YDS','TD','INT','SACKS']
                  : ['MIN','PTS','REB','AST','STL','BLK','FG','3PT','TO'];
                const keyIndices = keyStats.map(k => labels.indexOf(k)).filter(i => i >= 0);
                const finalIndices = keyIndices.length > 0 ? keyIndices : labels.map((_, i) => i).slice(0, 8);
                const displayLabels = finalIndices.map(i => labels[i]);
                return (
                  <div key={teamPlayers.team} className={styles.boxScoreBlock}>
                    <div className={styles.teamStatsHeader}>
                      {teamPlayers.teamLogo && <img src={teamPlayers.teamLogo} alt={teamPlayers.team} className={styles.teamStatsLogo} />}
                      <span className={styles.teamStatsName}>{teamPlayers.teamName}</span>
                    </div>
                    <div className={styles.boxScoreTable}>
                      <div className={styles.boxScoreRow + ' ' + styles.boxScoreHeader}>
                        <div className={styles.boxScorePlayer}>PLAYER</div>
                        {displayLabels.map(l => <div key={l} className={styles.boxScoreStat}>{l}</div>)}
                      </div>
                      {statGroup.athletes?.map(athlete => (
                        <div key={athlete.id} className={`${styles.boxScoreRow} ${athlete.starter ? styles.boxScoreStarter : ''} ${athlete.didNotPlay ? styles.boxScoreDNP : ''}`}>
                          <div className={styles.boxScorePlayer}>
                            <span className={styles.boxScoreJersey}>{athlete.jersey}</span>
                            <span className={styles.boxScoreName}>{athlete.shortName}</span>
                            <span className={styles.boxScorePos}>{athlete.position}</span>
                          </div>
                          {athlete.didNotPlay ? (
                            <div className={styles.boxScoreDNPLabel} style={{flex:4,textAlign:'left',paddingLeft:'4px'}}>{athlete.reason || 'DNP'}</div>
                          ) : finalIndices.map((ki, idx) => (
                            <div key={idx} className={styles.boxScoreStat}>{athlete.stats?.[ki] || '—'}</div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={styles.divider} onMouseDown={startDrag} onTouchStart={startDrag}>
          <div className={styles.dividerHandle}></div>
        </div>

        {chatPanel}
      </div>
    </main>
  );
}

function RemoteVideoTile({ track, name }) {
  const videoRef = useRef(null);
  useEffect(() => {
    if (track?.mediaStreamTrack && videoRef.current) {
      videoRef.current.srcObject = new MediaStream([track.mediaStreamTrack]);
    }
    return () => { if (videoRef.current) videoRef.current.srcObject = null; };
  }, [track]);
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <video ref={videoRef} autoPlay playsInline
        style={{ width: '140px', height: '100px', objectFit: 'cover', borderRadius: '10px', background: '#111', border: '1px solid rgba(255,255,255,0.1)' }} />
      <div style={{ position: 'absolute', bottom: '4px', left: '6px', fontSize: '10px', color: 'white', background: 'rgba(0,0,0,0.6)', borderRadius: '4px', padding: '1px 5px' }}>{name}</div>
    </div>
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
                  onClick={() => { toggleReaction(msg.id, e); setShowPicker(false); }}>{e}</button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
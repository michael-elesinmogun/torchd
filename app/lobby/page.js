'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import styles from './lobby.module.css';
 
const GAMES = [
  { id: 1, sport: 'NBA', homeTeam: 'BOS', awayTeam: 'LAL', homeColor: '#4ade80', awayColor: '#f87171', homeScore: 108, awayScore: 102, period: 'Q3 · 4:22', status: 'live', viewers: 312 },
  { id: 2, sport: 'NBA', homeTeam: 'DAL', awayTeam: 'GSW', homeColor: '#60a5fa', awayColor: '#fbbf24', homeScore: 88, awayScore: 91, period: 'Q2 · 1:45', status: 'live', viewers: 198 },
  { id: 3, sport: 'NBA', homeTeam: 'MIL', awayTeam: 'PHX', homeColor: '#a78bfa', awayColor: '#f97316', homeScore: null, awayScore: null, period: 'Tonight 8:30 PM', status: 'upcoming', viewers: 47 },
  { id: 4, sport: 'NBA', homeTeam: 'OKC', awayTeam: 'MEM', homeColor: '#38bdf8', awayColor: '#4ade80', homeScore: null, awayScore: null, period: 'Tonight 10:00 PM', status: 'upcoming', viewers: 21 },
];
 
const INITIAL_TAKES = [
  { id: 1, av: '#3B82F6', init: 'JK', name: 'Jordan K.', team: 'Celtics fan', text: '"Celtics defense is on another level tonight. LeBron has no answer for Jaylen Brown — this is over."', votes: 142 },
  { id: 2, av: '#F59E0B', init: 'TW', name: 'Tyler W.', team: 'Celtics fan', text: '"AD is carrying this team again. Lakers live and die with Anthony Davis and everyone knows it."', votes: 89 },
  { id: 3, av: '#EF4444', init: 'DW', name: 'Darius W.', team: 'Lakers fan', text: '"LeBron at 39 doing this is actually insane. We are watching history and people are sleeping on it."', votes: 74 },
  { id: 4, av: '#10B981', init: 'SR', name: 'Simone R.', team: 'NBA fan', text: '"This Celtics team reminds me of the 2016 Warriors. Stacked. Motivated. Playing with something to prove."', votes: 61 },
];
 
const AUTO_CHAT = [
  { name: 'NickNight', text: 'Austin Reaves is a problem, give him his credit' },
  { name: 'ZMoney', text: 'Tatum is going for 40 tonight, watch 👀' },
  { name: 'KingRick', text: 'THIS CELTICS DEFENSE IS NOT HUMAN' },
  { name: 'AshleyLive', text: 'Someone needs to check LeBron, he looks gassed' },
  { name: 'DakotaL', text: 'The officiating has been terrible this 3rd quarter' },
  { name: 'BriB', text: 'Jayson Tatum is going off and nobody is stopping him' },
];
 
export default function Lobby() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeGame, setActiveGame] = useState(GAMES[0]);
  const [takes, setTakes] = useState(INITIAL_TAKES);
  const [votedTakes, setVotedTakes] = useState([]);
  const [chatMessages, setChatMessages] = useState([
    { name: 'Jordan K.', text: 'Jaylen Brown is COOKING tonight 🔥', isMe: false },
    { name: 'Darius W.', text: 'AD with 24 and 11 already, y\'all worried about Jaylen lmao', isMe: false },
    { name: 'Simone R.', text: 'This game is going to overtime, calling it now', isMe: false },
    { name: 'Tyler W.', text: 'The Celtics defense in the 3rd quarter has been ELITE', isMe: false },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [viewers, setViewers] = useState(3842);
  const [onCam, setOnCam] = useState(false);
 
  // Auto chat
  useEffect(() => {
    let idx = 0;
    const interval = setInterval(() => {
      setChatMessages(prev => [...prev.slice(-30), { name: AUTO_CHAT[idx % AUTO_CHAT.length].name, text: AUTO_CHAT[idx % AUTO_CHAT.length].text, isMe: false }]);
      idx++;
    }, 4000);
    return () => clearInterval(interval);
  }, []);
 
  // Viewer drift
  useEffect(() => {
    const interval = setInterval(() => {
      setViewers(v => Math.max(3000, v + Math.floor(Math.random() * 15) - 5));
    }, 5000);
    return () => clearInterval(interval);
  }, []);
 
  function sendChat() {
    if (!chatInput.trim()) return;
    setChatMessages(prev => [...prev, { name: 'You', text: chatInput, isMe: true }]);
    setChatInput('');
  }
 
  function voteOnTake(id) {
    if (votedTakes.includes(id)) return;
    setVotedTakes(prev => [...prev, id]);
    setTakes(prev => prev.map(t => t.id === id ? { ...t, votes: t.votes + 1 } : t));
  }
 
  const filters = ['all', 'NBA', 'NFL', 'Soccer'];
 
  return (
    <main className={styles.main}>
 
      {/* NAV */}
      <nav className={styles.nav}>
        <div className={styles.navLeft}>
          <Link href="/" className={styles.logo}>🔥 Torchd</Link>
          <Link href="/" className={styles.navBack}>← Back</Link>
        </div>
        <div className={styles.navRight}>
          <div className={styles.livePill}><div className={styles.liveDot}></div> LIVE</div>
          <div className={styles.viewerCount}>👁 {viewers.toLocaleString()} watching</div>
        </div>
      </nav>
 
      <div className={styles.layout}>
 
        {/* MAIN */}
        <div className={styles.lobbyMain}>
 
          {/* Header */}
          <div className={styles.lobbyHeader}>
            <div>
              <div className={styles.eyebrow}><span className={styles.liveDotSmall}></span> Game Night</div>
              <h1 className={styles.pageTitle}>Game Lobby</h1>
            </div>
            <div className={styles.filters}>
              {filters.map(f => (
                <button key={f} className={`${styles.filterBtn} ${activeFilter === f ? styles.filterActive : ''}`} onClick={() => setActiveFilter(f)}>
                  {f === 'all' ? 'All Games' : f}
                </button>
              ))}
            </div>
          </div>
 
          {/* Games grid */}
          <div className={styles.gamesGrid}>
            {GAMES.map(game => (
              <div key={game.id} className={`${styles.gameCard} ${game.status === 'live' ? styles.gameCardLive : styles.gameCardUpcoming} ${activeGame.id === game.id ? styles.gameCardActive : ''}`} onClick={() => game.status === 'live' && setActiveGame(game)}>
                <div className={styles.gameCardTop}>
                  {game.status === 'live'
                    ? <div className={styles.gameLiveBadge}><div className={styles.liveDot}></div> LIVE</div>
                    : <div className={styles.gameUpcomingBadge}>Upcoming</div>
                  }
                  <div className={styles.gamePeriod}>{game.period}</div>
                </div>
                <div className={styles.gameTeams}>
                  <div className={styles.teamBlock}>
                    <div className={styles.teamAbbr} style={{ color: game.homeColor }}>{game.homeTeam}</div>
                    <div className={styles.teamScore} style={{ color: game.status === 'upcoming' ? '#3D4A66' : '#EEF2FF' }}>{game.homeScore ?? '—'}</div>
                  </div>
                  <div className={styles.scoreDash}>—</div>
                  <div className={styles.teamBlock}>
                    <div className={styles.teamAbbr} style={{ color: game.awayColor }}>{game.awayTeam}</div>
                    <div className={styles.teamScore} style={{ color: game.status === 'upcoming' ? '#3D4A66' : '#EEF2FF' }}>{game.awayScore ?? '—'}</div>
                  </div>
                </div>
                <div className={styles.gameCardBottom}>
                  <div className={styles.gameViewers}>{game.status === 'live' ? `${game.viewers} in lobby` : `${game.viewers} waiting`}</div>
                  {game.status === 'live'
                    ? <div className={styles.joinBtn}>Join →</div>
                    : <div className={styles.joinBtnDisabled}>Opens soon</div>
                  }
                </div>
              </div>
            ))}
          </div>
 
          {/* Active lobby video room */}
          <div className={styles.activeLobby}>
            <div className={styles.activeLobbyHeader}>
              <div>
                <div className={styles.activeLobbyTitle}>{activeGame.homeTeam} vs {activeGame.awayTeam} — Live Lobby</div>
                <div className={styles.activeLobbyMeta}>{activeGame.viewers} fans · {activeGame.period}</div>
              </div>
              <button className={`${styles.joinCamBtn} ${onCam ? styles.joinCamActive : ''}`} onClick={() => setOnCam(!onCam)}>
                {onCam ? '✓ On Camera' : '📷 Join on Camera'}
              </button>
            </div>
            <div className={styles.videoGrid}>
              {[
                { av: '#3B82F6', init: 'JK', name: 'Jordan K.', team: 'Celtics fan', speaking: true },
                { av: '#EF4444', init: 'DW', name: 'Darius W.', team: 'Lakers fan', speaking: false },
                { av: '#10B981', init: 'SR', name: 'Simone R.', team: 'NBA fan', speaking: false },
                { av: '#F59E0B', init: 'TW', name: 'Tyler W.', team: 'Celtics fan', speaking: false },
              ].map((p, i) => (
                <div key={i} className={styles.videoTile}>
                  {p.speaking && <div className={styles.speakingIndicator}></div>}
                  <div className={styles.videoAvatar} style={{ background: p.av }}>{p.init}</div>
                  <div className={styles.videoName}>{p.name}</div>
                  <div className={styles.videoTeam}>{p.team}</div>
                </div>
              ))}
              {onCam
                ? <div className={`${styles.videoTile} ${styles.videoTileMe}`}>
                    <div className={styles.speakingIndicator}></div>
                    <div className={styles.videoAvatar} style={{ background: '#3B82F6' }}>Me</div>
                    <div className={styles.videoName}>You</div>
                    <div className={styles.videoTeam}>Just joined</div>
                  </div>
                : <div className={styles.videoTileEmpty} onClick={() => setOnCam(true)}>
                    <span>+ Join</span>
                  </div>
              }
              <div className={styles.videoTileEmpty} onClick={() => setOnCam(true)}>
                <span>+ Join</span>
              </div>
            </div>
          </div>
 
          {/* Hot takes */}
          <div className={styles.takesSection}>
            <div className={styles.takesSectionHeader}>
              <div className={styles.eyebrow}><span className={styles.liveDotSmall}></span> Hot takes — {activeGame.homeTeam} vs {activeGame.awayTeam}</div>
              <div className={styles.sortLabel}>Sort: Top ▾</div>
            </div>
            <div className={styles.takesList}>
              {takes.map(take => (
                <div key={take.id} className={styles.takeCard}>
                  <div className={styles.takeHeader}>
                    <div className={styles.takeAv} style={{ background: take.av }}>{take.init}</div>
                    <div className={styles.takeName}>{take.name} · {take.team}</div>
                  </div>
                  <div className={styles.takeText}>{take.text}</div>
                  <div className={styles.takeActions}>
                    <button className={`${styles.takeVoteBtn} ${votedTakes.includes(take.id) ? styles.takeVoted : ''}`} onClick={() => voteOnTake(take.id)}>
                      ▲ {take.votes}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
 
        </div>
 
        {/* SIDEBAR */}
        <div className={styles.sidebar}>
          <div className={styles.scoreboardSection}>
            <div className={styles.sectionTitle}>🏀 Scores tonight</div>
            {GAMES.map(game => (
              <div key={game.id} className={styles.scoreRow}>
                <div>
                  <div className={styles.scoreTeams}>
                    <span style={{ color: game.homeColor }}>{game.homeTeam}</span> vs <span style={{ color: game.awayColor }}>{game.awayTeam}</span>
                  </div>
                  <div className={styles.scorePeriod} style={{ color: game.status === 'live' ? '#F59E0B' : '#3D4A66' }}>{game.period}</div>
                </div>
                <div className={styles.scoreValue}>{game.homeScore !== null ? `${game.homeScore} – ${game.awayScore}` : '—'}</div>
              </div>
            ))}
          </div>
 
          <div className={styles.chatMessages} id="lobby-chat">
            {chatMessages.map((m, i) => (
              <div key={i} className={styles.chatMsg}>
                <div className={styles.chatMsgName} style={{ color: m.isMe ? '#60A5FA' : '#6B7A9E' }}>{m.name}</div>
                <div className={`${styles.chatMsgText} ${m.isMe ? styles.chatMsgTextMe : ''}`}>{m.text}</div>
              </div>
            ))}
          </div>
 
          <div className={styles.chatInputRow}>
            <input
              className={styles.chatInput}
              placeholder="Drop a take…"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendChat()}
            />
            <button className={styles.chatSend} onClick={sendChat}>↑</button>
          </div>
        </div>
 
      </div>
    </main>
  );
}
 
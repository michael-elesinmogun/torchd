'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import styles from './battle.module.css';

export default function Battle() {
  const [seconds, setSeconds] = useState(105);
  const [votes, setVotes] = useState({ jordan: 524, darius: 323 });
  const [voted, setVoted] = useState(null);
  const [viewers, setViewers] = useState(1247);
  const [activeTab, setActiveTab] = useState('chat');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([
    { av: '#3B82F6', init: 'MJ', name: 'MikeJordan23', badge: 'FOR', text: 'Jordan bringing the FACTS right now 🔥' },
    { av: '#8B5CF6', init: 'SR', name: 'SportsRaven', badge: null, text: '6 rings > 4 rings, simple math' },
    { av: '#10B981', init: 'TW', name: 'TylerW', badge: 'AGAINST', text: 'MJ never went 3-6 in the Finals though 💀' },
    { av: '#F59E0B', init: 'DL', name: 'DakotaLive', badge: null, text: 'Darius needs to bring up the 1-9 in playoff series stats' },
    { av: '#EF4444', init: 'KR', name: 'KingRick', badge: 'FOR', text: 'LeBron played in a harder era tho, East was stacked' },
  ]);

  const autoMessages = [
    { av: '#3B82F6', init: 'JB', name: 'JaBari', badge: null, text: 'Bron carrying teams MJ never would have survived on 😭' },
    { av: '#10B981', init: 'NN', name: 'NickNight', badge: 'AGAINST', text: 'Pippen was just as important as Scottie was to LeBron. Same thing.' },
    { av: '#F59E0B', init: 'KC', name: 'KayCee', badge: null, text: 'FOUR FINALS MVPs. The man locked in every time 👑' },
    { av: '#8B5CF6', init: 'RP', name: 'RealPundit', badge: 'FOR', text: 'The stats don\'t lie. Points, assists, rebounds — nobody has done all three at his level' },
    { av: '#EC4899', init: 'VB', name: 'Vibe_B', badge: 'FOR', text: 'I came here as a MJ fan and Jordan is actually changing my mind...' },
  ];

  useEffect(() => {
    const interval = setInterval(() => setSeconds(s => s > 0 ? s - 1 : 0), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!voted) {
        setVotes(v => ({
          jordan: v.jordan + (Math.random() > 0.5 ? Math.floor(Math.random() * 3) : 0),
          darius: v.darius + (Math.random() > 0.5 ? Math.floor(Math.random() * 2) : 0),
        }));
      }
    }, 2800);
    return () => clearInterval(interval);
  }, [voted]);

  useEffect(() => {
    const interval = setInterval(() => setViewers(v => Math.max(1000, v + Math.floor(Math.random() * 10) - 3)), 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let idx = 0;
    const interval = setInterval(() => {
      setMessages(prev => [...prev.slice(-20), autoMessages[idx % autoMessages.length]]);
      idx++;
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  function formatTime(s) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  function castVote(side) {
    if (voted) return;
    setVoted(side);
    setVotes(v => ({ ...v, [side]: v[side] + 1 }));
  }

  function sendChat() {
    if (!chatInput.trim()) return;
    setMessages(prev => [...prev, { av: '#3B82F6', init: 'Me', name: 'You', badge: null, text: chatInput, isMe: true }]);
    setChatInput('');
  }

  const total = votes.jordan + votes.darius;
  const jordanPct = Math.round((votes.jordan / total) * 100);
  const dariusPct = 100 - jordanPct;
  const timerClass = seconds <= 15 ? styles.timerCritical : seconds <= 30 ? styles.timerWarning : styles.timerNormal;
  const progressPct = (seconds / 120) * 100;

  return (
    <main className={styles.main}>

      <div className={styles.layout}>

        {/* MAIN STAGE */}
        <div className={styles.stage}>

          <div className={styles.topicBar}>
            <div className={styles.topicTag}>NBA · Tonight</div>
            <div className={styles.topicText}>"LeBron James is the greatest basketball player of all time"</div>
            <div className={styles.roundBadge}>Round <strong>2</strong> of 3</div>
          </div>

          <div className={styles.videoStage}>
            <div className={`${styles.playerTile} ${styles.leftTile}`}>
              <div className={styles.playerAvatarWrap}>
                <div className={`${styles.playerAvatar} ${styles.avatarBlue}`}>
                  JK
                  <div className={styles.speakingRing}></div>
                </div>
                <div className={styles.speakingLabel}>Speaking now</div>
              </div>
              <div className={styles.playerInfo}>
                <div className={styles.playerName}>Jordan Kim</div>
                <div className={styles.playerLocation}>Boston, MA · NBA Fan</div>
                <div className={`${styles.stanceBadge} ${styles.stanceFor}`}>FOR — LeBron is the GOAT</div>
                <div className={styles.playerStats}>
                  <span>W/L <strong>38–14</strong></span>
                  <span>Rank <strong>#7</strong></span>
                </div>
              </div>
            </div>

            <div className={styles.vsDivider}>
              <div className={styles.vsCircle}>VS</div>
            </div>

            <div className={`${styles.playerTile} ${styles.rightTile}`}>
              <div className={styles.playerAvatarWrap}>
                <div className={`${styles.playerAvatar} ${styles.avatarRed}`}>DW</div>
              </div>
              <div className={styles.playerInfo}>
                <div className={styles.playerName}>Darius Webb</div>
                <div className={styles.playerLocation}>Chicago, IL · NBA Fan</div>
                <div className={`${styles.stanceBadge} ${styles.stanceAgainst}`}>AGAINST — MJ wins</div>
                <div className={styles.playerStats}>
                  <span>W/L <strong>22–9</strong></span>
                  <span>Rank <strong>#24</strong></span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.timerBar}>
            <div className={styles.timerDisplay}>
              <span className={timerClass}>{formatTime(seconds)}</span>
              <span className={styles.timerLabel}>remaining</span>
            </div>
            <div className={styles.progressWrap}>
              <div className={styles.progressLabels}>
                <span>Jordan speaking</span>
                <span>Round 2 · 2:00</span>
              </div>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: `${progressPct}%`, background: seconds <= 15 ? '#EF4444' : seconds <= 30 ? '#F59E0B' : '#3B82F6' }}></div>
              </div>
            </div>
            <div className={styles.roundPips}>
              <div className={`${styles.pip} ${styles.pipDone}`}></div>
              <div className={`${styles.pip} ${styles.pipActive}`}></div>
              <div className={`${styles.pip} ${styles.pipPending}`}></div>
            </div>
          </div>

          <div className={styles.voteArea}>
            <button className={`${styles.voteBtn} ${styles.voteBtnBlue} ${voted === 'jordan' ? styles.voteSelected : ''} ${voted && voted !== 'jordan' ? styles.voteDimmed : ''}`} onClick={() => castVote('jordan')}>
              <span className={styles.voteBtnLabel}>Vote for Jordan</span>
              <span className={styles.votePct}>{jordanPct}%</span>
            </button>
            <div className={styles.voteDivider}>{voted ? 'Vote cast ✓' : 'Cast your vote'}</div>
            <button className={`${styles.voteBtn} ${styles.voteBtnRed} ${voted === 'darius' ? styles.voteSelected : ''} ${voted && voted !== 'darius' ? styles.voteDimmed : ''}`} onClick={() => castVote('darius')}>
              <span className={styles.votePct}>{dariusPct}%</span>
              <span className={styles.voteBtnLabel}>Vote for Darius</span>
            </button>
          </div>

        </div>

        {/* SIDEBAR */}
        <div className={styles.sidebar}>

          <div className={styles.voteTracker}>
            <div className={styles.trackerTitle}>Live vote count</div>
            <div className={styles.trackerRow}>
              <div className={styles.trackerName}>Jordan</div>
              <div className={styles.trackerBarWrap}><div className={styles.trackerBarBlue} style={{ width: `${jordanPct}%` }}></div></div>
              <div className={`${styles.trackerPct} ${styles.trackerPctBlue}`}>{jordanPct}%</div>
            </div>
            <div className={styles.trackerRow}>
              <div className={styles.trackerName}>Darius</div>
              <div className={styles.trackerBarWrap}><div className={styles.trackerBarRed} style={{ width: `${dariusPct}%` }}></div></div>
              <div className={`${styles.trackerPct} ${styles.trackerPctRed}`}>{dariusPct}%</div>
            </div>
            <div className={styles.trackerTotal}>{total.toLocaleString()} votes cast</div>
          </div>

          <div className={styles.sidebarTabs}>
            <button className={`${styles.sidebarTab} ${activeTab === 'chat' ? styles.tabActive : ''}`} onClick={() => setActiveTab('chat')}>Chat</button>
            <button className={`${styles.sidebarTab} ${activeTab === 'audience' ? styles.tabActive : ''}`} onClick={() => setActiveTab('audience')}>Audience</button>
          </div>

          {activeTab === 'chat' && (
            <div className={styles.chatMessages}>
              {messages.map((m, i) => (
                <div key={i} className={styles.chatMsg}>
                  <div className={styles.chatAv} style={{ background: m.av }}>{m.init}</div>
                  <div className={styles.chatBody}>
                    <div className={styles.chatName}>
                      {m.name}
                      {m.badge && <span className={`${styles.chatBadge} ${m.badge === 'FOR' ? styles.badgeBlue : styles.badgeRed}`}>{m.badge}</span>}
                    </div>
                    <div className={`${styles.chatText} ${m.isMe ? styles.chatTextMe : ''}`}>{m.text}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'audience' && (
            <div className={styles.chatMessages}>
              <div className={styles.audienceTitle}>{viewers.toLocaleString()} watching now</div>
              {[
                { av: '#3B82F6', init: 'MJ', name: 'MikeJordan23', team: 'Bulls fan · FOR' },
                { av: '#10B981', init: 'TW', name: 'TylerW', team: 'Celtics fan · AGAINST' },
                { av: '#8B5CF6', init: 'SR', name: 'SportsRaven', team: 'Lakers fan · FOR' },
                { av: '#F59E0B', init: 'DL', name: 'DakotaLive', team: 'Knicks fan' },
                { av: '#EF4444', init: 'KR', name: 'KingRick', team: 'Heat fan · FOR' },
                { av: '#06B6D4', init: 'AL', name: 'AshleyLive', team: 'Warriors fan' },
              ].map((v, i) => (
                <div key={i} className={styles.viewerRow}>
                  <div className={styles.viewerAv} style={{ background: v.av }}>{v.init}</div>
                  <div>
                    <div className={styles.viewerName}>{v.name}</div>
                    <div className={styles.viewerTeam}>{v.team}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className={styles.reactionsBar}>
            {['🔥', '💀', '👑', '😤', '🐐'].map(emoji => (
              <button key={emoji} className={styles.reactionBtn}>{emoji}</button>
            ))}
          </div>

          <div className={styles.chatInputRow}>
            <input className={styles.chatInput} placeholder="Say something…" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} />
            <button className={styles.chatSend} onClick={sendChat}>↑</button>
          </div>

          <div style={{padding:'0.75rem',borderTop:'1px solid rgba(255,255,255,0.065)',display:'flex',alignItems:'center',gap:'8px'}}>
            <div style={{fontSize:'13px',color:'#6B7A9E'}}>👁 {viewers.toLocaleString()} watching</div>
          </div>

        </div>
      </div>
    </main>
  );
}
'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import styles from './battle.module.css';

const BATTLE_ID = 'd63ea70a-6613-481b-9524-04d810cafdd0';

export default function Battle() {
  const [seconds, setSeconds] = useState(105);
  const [votes, setVotes] = useState({ player1: 0, player2: 0 });
  const [voted, setVoted] = useState(null); // 'player1' | 'player2' | null
  const [user, setUser] = useState(null);
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

  // Load user session + existing vote + vote counts on mount
  useEffect(() => {
    async function init() {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      // Load vote counts
      await loadVotes();

      // Check if user already voted
      if (currentUser) {
        const { data: existingVote } = await supabase
          .from('votes')
          .select('side')
          .eq('battle_id', BATTLE_ID)
          .eq('user_id', currentUser.id)
          .single();

        if (existingVote) setVoted(existingVote.side);
      }
    }

    init();

    // Subscribe to real-time vote changes
    const channel = supabase
      .channel('votes-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'votes',
        filter: `battle_id=eq.${BATTLE_ID}`,
      }, () => {
        loadVotes();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  async function loadVotes() {
    const { data, error } = await supabase
      .from('votes')
      .select('side')
      .eq('battle_id', BATTLE_ID);

    if (error) return;

    const p1 = data.filter(v => v.side === 'player1').length;
    const p2 = data.filter(v => v.side === 'player2').length;
    setVotes({ player1: p1, player2: p2 });
  }

  async function castVote(side) {
    if (voted) return;

    if (!user) {
      window.location.href = '/login';
      return;
    }

    // Optimistic update
    setVoted(side);
    setVotes(v => ({ ...v, [side]: v[side] + 1 }));

    const { error } = await supabase
      .from('votes')
      .insert({ battle_id: BATTLE_ID, user_id: user.id, side });

    if (error) {
      // Revert on error
      console.error('Vote error:', error.message);
      setVoted(null);
      setVotes(v => ({ ...v, [side]: v[side] - 1 }));
    }
  }

  // Timer
  useEffect(() => {
    const interval = setInterval(() => setSeconds(s => s > 0 ? s - 1 : 0), 1000);
    return () => clearInterval(interval);
  }, []);

  // Viewer count wiggle
  useEffect(() => {
    const interval = setInterval(() => setViewers(v => Math.max(1000, v + Math.floor(Math.random() * 10) - 3)), 4000);
    return () => clearInterval(interval);
  }, []);

  // Auto chat messages
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

  function sendChat() {
    if (!chatInput.trim()) return;
    setMessages(prev => [...prev, { av: '#3B82F6', init: 'Me', name: 'You', badge: null, text: chatInput, isMe: true }]);
    setChatInput('');
  }

  const total = votes.player1 + votes.player2;
  const jordanPct = total === 0 ? 50 : Math.round((votes.player1 / total) * 100);
  const dariusPct = total === 0 ? 50 : 100 - jordanPct;
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
            <button
              className={`${styles.voteBtn} ${styles.voteBtnBlue} ${voted === 'player1' ? styles.voteSelected : ''} ${voted && voted !== 'player1' ? styles.voteDimmed : ''}`}
              onClick={() => castVote('player1')}
            >
              <span className={styles.voteBtnLabel}>{!user ? '🔒 Sign in to vote' : 'Vote for Jordan'}</span>
              <span className={styles.votePct}>{jordanPct}%</span>
            </button>
            <div className={styles.voteDivider}>
              {voted ? 'Vote cast ✓' : total > 0 ? `${total} votes` : 'Cast your vote'}
            </div>
            <button
              className={`${styles.voteBtn} ${styles.voteBtnRed} ${voted === 'player2' ? styles.voteSelected : ''} ${voted && voted !== 'player2' ? styles.voteDimmed : ''}`}
              onClick={() => castVote('player2')}
            >
              <span className={styles.votePct}>{dariusPct}%</span>
              <span className={styles.voteBtnLabel}>{!user ? '🔒 Sign in to vote' : 'Vote for Darius'}</span>
            </button>
          </div>

          {!user && (
            <p style={{ textAlign: 'center', fontSize: '13px', color: '#6B7A9E', marginTop: '0.5rem' }}>
              <Link href="/login" style={{ color: '#60A5FA', textDecoration: 'none' }}>Sign in</Link> or{' '}
              <Link href="/signup" style={{ color: '#60A5FA', textDecoration: 'none' }}>create an account</Link> to cast your vote
            </p>
          )}

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
            <div className={styles.trackerTotal}>{total} vote{total !== 1 ? 's' : ''} cast</div>
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
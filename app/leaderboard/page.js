'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import styles from './leaderboard.module.css';

const TOP3 = [
  { rank: 2, init: 'SR', name: 'Simone R.', handle: '@simone_debateking', pts: 4210, wins: 38, winRate: 71, bg: '#10B981' },
  { rank: 1, init: 'MJ', name: 'Mike J.', handle: '@mikej_takes', pts: 4820, wins: 52, winRate: 84, bg: '#3B82F6' },
  { rank: 3, init: 'TW', name: 'Tyler W.', handle: '@tylertakes', pts: 3980, wins: 31, winRate: 67, bg: '#F59E0B' },
];

const ROWS = [
  { rank: 4, init: 'KR', name: 'King Rick', sport: 'NBA · NFL', pts: 3720, winRate: 79, battles: 47, trend: '+2', trendUp: true, bg: '#8B5CF6' },
  { rank: 5, init: 'AL', name: 'Ashley L.', sport: 'NBA', pts: 3510, winRate: 74, battles: 43, trend: '+1', trendUp: true, bg: '#EF4444' },
  { rank: 6, init: 'DL', name: 'Dakota L.', sport: 'NFL', pts: 3290, winRate: 68, battles: 39, trend: '-1', trendUp: false, bg: '#06B6D4' },
  { rank: 7, init: 'BN', name: 'Brianna N.', sport: 'NBA · Soccer', pts: 3180, winRate: 72, battles: 36, trend: '—', trendUp: null, bg: '#EC4899' },
  { rank: 8, init: 'PK', name: 'Peter K.', sport: 'NFL', pts: 2960, winRate: 65, battles: 34, trend: '+3', trendUp: true, bg: '#F97316' },
  { rank: 9, init: 'ZM', name: 'Z Money', sport: 'NBA', pts: 2830, winRate: 63, battles: 32, trend: '-2', trendUp: false, bg: '#14B8A6' },
  { rank: 10, init: 'NR', name: 'Nadia R.', sport: 'NBA · Soccer', pts: 2710, winRate: 70, battles: 29, trend: '+1', trendUp: true, bg: '#6366F1' },
  { rank: 11, init: 'JB', name: 'Jabari B.', sport: 'NBA', pts: 2590, winRate: 66, battles: 28, trend: '—', trendUp: null, bg: '#84CC16' },
  { rank: 12, init: 'VC', name: 'Vee C.', sport: 'NFL · NBA', pts: 2440, winRate: 61, battles: 27, trend: '-1', trendUp: false, bg: '#F43F5E' },
  { rank: 13, init: 'TS', name: 'Tony S.', sport: 'NFL', pts: 2310, winRate: 60, battles: 25, trend: '+4', trendUp: true, bg: '#A855F7' },
  { rank: 14, init: 'JK', name: 'Jordan K.', sport: 'NBA · NFL', pts: 1640, winRate: 71, battles: 42, trend: '+2', trendUp: true, bg: '#3B82F6', isMe: true },
  { rank: 15, init: 'RD', name: 'Real Deal', sport: 'NBA', pts: 1580, winRate: 58, battles: 23, trend: '-3', trendUp: false, bg: '#0EA5E9' },
];

const FILTERS = ['All Sports', 'NBA', 'NFL', 'This Week', 'This Month', 'All Time'];

const AVATAR_COLORS = ['#3B82F6','#10B981','#F59E0B','#8B5CF6','#EF4444','#06B6D4','#EC4899','#F97316','#14B8A6','#6366F1','#84CC16','#A855F7'];

export default function Leaderboard() {
  const [activeFilter, setActiveFilter] = useState('All Sports');
  const [realUsers, setRealUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    async function fetchUsers() {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUser(session?.user ?? null);

      const { data } = await supabase
        .from('profiles')
        .select('username, full_name, sport, avatar_url')
        .order('username', { ascending: true })
        .limit(50);

      if (data) setRealUsers(data);
    }
    fetchUsers();
  }, []);

  // On desktop: 2nd | 1st | 3rd (visual podium height trick)
  // On mobile: CSS single-column so we reorder in JSX to 1st, 2nd, 3rd
  // We render 1st, 2nd, 3rd and use CSS order property for desktop rearrangement
  const podiumDesktopOrder = [TOP3[1], TOP3[0], TOP3[2]]; // 1st, 2nd, 3rd in DOM

  return (
    <main className={styles.main}>

      <div className={styles.page}>

        {/* Hero */}
        <div className={styles.hero}>
          <div className={styles.heroBg}></div>
          <div className={styles.heroInner}>
            <div className={styles.eyebrow}><span className={styles.eyebrowDot}></span> Global Rankings</div>
            <h1 className={styles.heroTitle}>Leaderboard</h1>
            <p className={styles.heroSub}>The sharpest debaters on Torchd. Win battles, earn points, climb the ranks.</p>
            <div className={styles.filters}>
              {FILTERS.map(f => (
                <button key={f} className={`${styles.filterBtn} ${activeFilter === f ? styles.filterActive : ''}`} onClick={() => setActiveFilter(f)}>{f}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Podium — DOM order: 2nd|1st|3rd for desktop visual layout.
             On mobile CSS sets grid-template-columns:1fr so we use
             .podiumFirst { order:-1 } to pull 1st to the top */}
        <div className={styles.podiumWrap}>
          <div className={styles.podium}>

            {/* 2ND — left on desktop */}
            <div className={`${styles.podiumCard} ${styles.podiumSecond}`}>
              <div className={styles.podiumRank}>🥈 2nd Place</div>
              <div className={styles.podiumAv} style={{ background: TOP3[0].bg }}>{TOP3[0].init}</div>
              <div className={styles.podiumName}>{TOP3[0].name}</div>
              <div className={styles.podiumHandle}>{TOP3[0].handle}</div>
              <div className={styles.podiumPts}>{TOP3[0].pts.toLocaleString()} pts</div>
              <div className={styles.podiumWins}>{TOP3[0].wins} wins · {TOP3[0].winRate}% win rate</div>
            </div>

            {/* 1ST — center on desktop, top on mobile via order:-1 */}
            <div className={`${styles.podiumCard} ${styles.podiumFirst}`}>
              <div className={styles.podiumRank}>🏆 Champion</div>
              <div className={styles.podiumCrown}>👑</div>
              <div className={styles.podiumAv} style={{ background: TOP3[1].bg, boxShadow: '0 0 0 3px #F59E0B, 0 0 20px rgba(245,158,11,0.2)' }}>{TOP3[1].init}</div>
              <div className={styles.podiumName}>{TOP3[1].name}</div>
              <div className={styles.podiumHandle}>{TOP3[1].handle}</div>
              <div className={`${styles.podiumPts} ${styles.podiumPtsGold}`}>{TOP3[1].pts.toLocaleString()} pts</div>
              <div className={styles.podiumWins}>{TOP3[1].wins} wins · {TOP3[1].winRate}% win rate</div>
            </div>

            {/* 3RD — right on desktop */}
            <div className={`${styles.podiumCard} ${styles.podiumThird}`}>
              <div className={styles.podiumRank}>🥉 3rd Place</div>
              <div className={styles.podiumAv} style={{ background: TOP3[2].bg }}>{TOP3[2].init}</div>
              <div className={styles.podiumName}>{TOP3[2].name}</div>
              <div className={styles.podiumHandle}>{TOP3[2].handle}</div>
              <div className={styles.podiumPts}>{TOP3[2].pts.toLocaleString()} pts</div>
              <div className={styles.podiumWins}>{TOP3[2].wins} wins · {TOP3[2].winRate}% win rate</div>
            </div>

          </div>
        </div>

        {/* Table + sidebar */}
        <div className={styles.bodyLayout}>

          <div className={styles.tableWrap}>
            <div className={styles.tableHeader}>
              <div>Rank</div>
              <div>Debater</div>
              <div>Points</div>
              <div>Win Rate</div>
              <div>Battles</div>
              <div>Trend</div>
            </div>

            {realUsers.length > 0 ? realUsers.map((row, i) => {
              const rank = i + 1;
              const initials = row.full_name
                ? row.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                : row.username.slice(0, 2).toUpperCase();
              const bg = AVATAR_COLORS[i % AVATAR_COLORS.length];
              const sportMap = { nba: 'NBA', nfl: 'NFL', soccer: 'Soccer', mlb: 'MLB', nhl: 'NHL', all: 'All Sports' };
              const sport = sportMap[row.sport?.toLowerCase()] || '—';
              const isMe = currentUser && row.username === currentUser.user_metadata?.username;

              return (
                <Link href={`/profile/${row.username}`} key={row.username} className={`${styles.tableRow} ${isMe ? styles.tableRowMe : ''}`}>
                  <div className={`${styles.rankNum} ${rank <= 5 ? styles.rankTop : ''}`}>{rank}</div>
                  <div className={styles.userCell}>
                    <div className={styles.userAv} style={{ background: bg }}>
                      {row.avatar_url
                        ? <img src={row.avatar_url} alt={row.username} style={{width:'100%',height:'100%',borderRadius:'50%',objectFit:'cover'}} />
                        : initials}
                    </div>
                    <div>
                      <div className={styles.userName}>
                        {row.full_name || row.username}
                        {isMe && <span className={styles.youBadge}>YOU</span>}
                      </div>
                      <div className={styles.userSport}>{sport}</div>
                    </div>
                  </div>
                  <div className={styles.ptsVal}>—</div>
                  <div className={styles.winRateVal} style={{color:'#6B7A9E'}}>—</div>
                  <div className={styles.battlesVal}>—</div>
                  <div className={styles.trendVal}>—</div>
                </Link>
              );
            }) : ROWS.map(row => (
              <Link href={`/profile/${row.name.toLowerCase().replace(/\s+/g, '')}`} key={row.rank} className={`${styles.tableRow} ${row.isMe ? styles.tableRowMe : ''}`}>
                <div className={`${styles.rankNum} ${row.rank <= 5 ? styles.rankTop : ''}`}>{row.rank}</div>
                <div className={styles.userCell}>
                  <div className={styles.userAv} style={{ background: row.bg }}>{row.init}</div>
                  <div>
                    <div className={styles.userName}>{row.name}{row.isMe && <span className={styles.youBadge}>YOU</span>}</div>
                    <div className={styles.userSport}>{row.sport}</div>
                  </div>
                </div>
                <div className={styles.ptsVal}>{row.pts.toLocaleString()}</div>
                <div className={styles.winRateVal} style={{ color: row.winRate >= 70 ? '#10B981' : row.winRate >= 60 ? '#F59E0B' : '#EF4444' }}>{row.winRate}%</div>
                <div className={styles.battlesVal}>{row.battles}</div>
                <div className={`${styles.trendVal} ${row.trendUp === true ? styles.trendUp : row.trendUp === false ? styles.trendDown : styles.trendSame}`}>{row.trend}</div>
              </Link>
            ))}
          </div>

          <div className={styles.lbSidebar}>

            <div className={styles.sideCard}>
              <div className={styles.sideCardTitle}>🔥 Hot streaks</div>
              {[
                { init: 'MJ', name: 'Mike J.', val: '12W 🔥', bg: '#3B82F6' },
                { init: 'TS', name: 'Tony S.', val: '8W 🔥', bg: '#A855F7' },
                { init: 'PK', name: 'Peter K.', val: '6W 🔥', bg: '#F97316' },
                { init: 'JK', name: 'Jordan K.', val: '5W 🔥', bg: '#3B82F6' },
              ].map((s, i) => (
                <div key={i} className={styles.miniRow}>
                  <div className={styles.miniNum}>{i + 1}</div>
                  <div className={styles.miniAv} style={{ background: s.bg }}>{s.init}</div>
                  <div className={styles.miniName}>{s.name}</div>
                  <div className={styles.miniVal}>{s.val}</div>
                </div>
              ))}
            </div>

            <div className={styles.sideCard}>
              <div className={styles.sideCardTitle}>📊 Most battles this week</div>
              {[
                { init: 'SR', name: 'Simone R.', val: '14', bg: '#10B981' },
                { init: 'AL', name: 'Ashley L.', val: '11', bg: '#EF4444' },
                { init: 'KR', name: 'King Rick', val: '9', bg: '#8B5CF6' },
              ].map((s, i) => (
                <div key={i} className={styles.miniRow}>
                  <div className={styles.miniNum}>{i + 1}</div>
                  <div className={styles.miniAv} style={{ background: s.bg }}>{s.init}</div>
                  <div className={styles.miniName}>{s.name}</div>
                  <div className={styles.miniVal}>{s.val}</div>
                </div>
              ))}
            </div>

            <div className={styles.sideCard}>
              <div className={styles.sideCardTitle}>⚡ Rising fast</div>
              {[
                { init: 'TS', name: 'Tony S.', val: '▲ 4', bg: '#A855F7' },
                { init: 'PK', name: 'Peter K.', val: '▲ 3', bg: '#F97316' },
                { init: 'JK', name: 'Jordan K.', val: '▲ 2', bg: '#3B82F6' },
              ].map((s, i) => (
                <div key={i} className={styles.miniRow}>
                  <div className={styles.miniAv} style={{ background: s.bg }}>{s.init}</div>
                  <div className={styles.miniName}>{s.name}</div>
                  <div className={styles.miniVal} style={{ color: '#10B981' }}>{s.val}</div>
                </div>
              ))}
            </div>

            <div className={`${styles.sideCard} ${styles.sideCardCta}`}>
              <div className={styles.myRankTitle}>Your rank: <span style={{ color: '#3B82F6' }}>#14</span></div>
              <div className={styles.myRankSub}>Win 2 more battles to reach #12</div>
              <Link href="/battle" className={styles.startBattleBtn}>Start a Battle →</Link>
            </div>

          </div>
        </div>
      </div>

    </main>
  );
}
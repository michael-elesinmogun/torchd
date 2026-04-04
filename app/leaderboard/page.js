'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import styles from './leaderboard.module.css';

const FILTERS = ['All Sports', 'NBA', 'NFL', 'MLB', 'NHL', 'Soccer'];
const AVATAR_COLORS = ['#3B82F6','#10B981','#F59E0B','#8B5CF6','#EF4444','#06B6D4','#EC4899','#F97316','#14B8A6','#6366F1','#84CC16','#A855F7'];

export default function Leaderboard() {
  const [activeFilter, setActiveFilter] = useState('All Sports');
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUser(session?.user ?? null);

      if (session?.user) {
        const { data: myProfile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', session.user.id)
          .single();
        setCurrentProfile(myProfile);
      }

      const { data } = await supabase
        .from('profiles')
        .select('username, full_name, sport, avatar_url, wins, losses, battles_count')
        .eq('show_on_leaderboard', true)
        .eq('is_public', true)
        .order('wins', { ascending: false })
        .limit(100);

      setUsers(data || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  const filtered = activeFilter === 'All Sports'
    ? users
    : users.filter(u => u.sport?.toLowerCase() === activeFilter.toLowerCase());

  const podium = filtered.slice(0, 3);
  const rest = filtered.slice(3);

  const sportLabel = { nba: 'NBA', nfl: 'NFL', soccer: 'Soccer', mlb: 'MLB', nhl: 'NHL' };

  function getInitials(u) {
    return u.full_name
      ? u.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      : u.username.slice(0, 2).toUpperCase();
  }

  function getWinRate(u) {
    if (!u.battles_count || u.battles_count === 0) return '—';
    return `${Math.round((u.wins / u.battles_count) * 100)}%`;
  }

  function getPoints(u) {
    return ((u.wins || 0) * 100) + ((u.battles_count || 0) * 10);
  }

  const podiumMedals = ['🏆 Champion', '🥈 2nd Place', '🥉 3rd Place'];
  const podiumVisualOrder = podium.length === 3 ? [podium[1], podium[0], podium[2]] : podium;
  const podiumCardStyles = podium.length === 3
    ? [styles.podiumSecond, styles.podiumFirst, styles.podiumThird]
    : [styles.podiumFirst];

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

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#6B7A9E' }}>Loading rankings...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#6B7A9E' }}>
            <div style={{ fontSize: '48px', marginBottom: '1rem' }}>🏆</div>
            <div style={{ fontSize: '18px', fontFamily: 'Syne, sans-serif', fontWeight: 800, color: '#EEF2FF', marginBottom: '0.5rem' }}>No debaters yet</div>
            <div style={{ fontSize: '14px' }}>Be the first to appear on the leaderboard — start a battle!</div>
            <Link href="/battle/start" style={{ display: 'inline-block', marginTop: '1.5rem', background: '#3B82F6', color: '#EEF2FF', borderRadius: '10px', padding: '12px 24px', textDecoration: 'none', fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>Start a Battle →</Link>
          </div>
        ) : (
          <>
            {/* Podium */}
            {podium.length > 0 && (
              <div className={styles.podiumWrap}>
                <div className={styles.podium}>
                  {podiumVisualOrder.map((user, i) => {
                    const originalRank = podium.indexOf(user);
                    const isFirst = originalRank === 0;
                    const bg = AVATAR_COLORS[filtered.indexOf(user) % AVATAR_COLORS.length];
                    const isMe = currentProfile?.username === user.username;

                    return (
                      <Link href={`/profile/${user.username}`} key={user.username} className={`${styles.podiumCard} ${podiumCardStyles[i]}`} style={{ textDecoration: 'none' }}>
                        <div className={styles.podiumRank}>{podiumMedals[originalRank]}</div>
                        {isFirst && <div className={styles.podiumCrown}>👑</div>}
                        <div className={styles.podiumAv} style={{
                          background: bg,
                          boxShadow: isFirst ? '0 0 0 3px #F59E0B, 0 0 20px rgba(245,158,11,0.2)' : undefined
                        }}>
                          {user.avatar_url
                            ? <img src={user.avatar_url} alt={user.username} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                            : getInitials(user)}
                        </div>
                        <div className={styles.podiumName}>
                          {user.full_name || user.username}
                          {isMe && <span className={styles.youBadge}>YOU</span>}
                        </div>
                        <div className={styles.podiumHandle}>@{user.username}</div>
                        <div className={`${styles.podiumPts} ${isFirst ? styles.podiumPtsGold : ''}`}>
                          {getPoints(user)} pts
                        </div>
                        <div className={styles.podiumWins}>
                          {user.wins || 0} wins · {getWinRate(user)} win rate
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Table + sidebar */}
            <div className={styles.bodyLayout}>
              <div className={styles.tableWrap}>
                <div className={styles.tableHeader}>
                  <div>Rank</div>
                  <div>Debater</div>
                  <div>Sport</div>
                  <div>Battles</div>
                  <div>Win Rate</div>
                  <div>Points</div>
                </div>

                {rest.map((user, i) => {
                  const rank = i + 4;
                  const bg = AVATAR_COLORS[(rank - 1) % AVATAR_COLORS.length];
                  const sport = sportLabel[user.sport?.toLowerCase()] || '—';
                  const isMe = currentProfile?.username === user.username;

                  return (
                    <Link href={`/profile/${user.username}`} key={user.username} className={`${styles.tableRow} ${isMe ? styles.tableRowMe : ''}`}>
                      <div className={`${styles.rankNum} ${rank <= 5 ? styles.rankTop : ''}`}>{rank}</div>
                      <div className={styles.userCell}>
                        <div className={styles.userAv} style={{ background: bg }}>
                          {user.avatar_url
                            ? <img src={user.avatar_url} alt={user.username} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                            : getInitials(user)}
                        </div>
                        <div>
                          <div className={styles.userName}>
                            {user.full_name || user.username}
                            {isMe && <span className={styles.youBadge}>YOU</span>}
                          </div>
                          <div className={styles.userSport}>@{user.username} · {sport}</div>
                        </div>
                      </div>
                      <div className={styles.battlesVal}>{user.battles_count || 0}</div>
                      <div className={styles.winRateVal} style={{ color: (user.wins || 0) > 0 ? '#10B981' : '#6B7A9E' }}>
                        {getWinRate(user)}
                      </div>
                      <div className={styles.ptsVal}>{getPoints(user)}</div>
                    </Link>
                  );
                })}
              </div>

              {/* Sidebar */}
              <div className={styles.lbSidebar}>
                <div className={styles.sideCard}>
                  <div className={styles.sideCardTitle}>📊 Total debaters</div>
                  <div style={{ fontSize: '36px', fontFamily: 'Syne, sans-serif', fontWeight: 800, color: '#3B82F6', padding: '0.5rem 0' }}>
                    {filtered.length}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6B7A9E' }}>on the leaderboard</div>
                </div>

                <div className={styles.sideCard}>
                  <div className={styles.sideCardTitle}>🏆 Top debater</div>
                  {podium[0] ? (
                    <Link href={`/profile/${podium[0].username}`} style={{ textDecoration: 'none' }}>
                      <div className={styles.miniRow} style={{ marginTop: '0.5rem' }}>
                        <div className={styles.miniAv} style={{ background: AVATAR_COLORS[0] }}>{getInitials(podium[0])}</div>
                        <div className={styles.miniName}>{podium[0].full_name || podium[0].username}</div>
                        <div className={styles.miniVal}>👑 {podium[0].wins || 0}W</div>
                      </div>
                    </Link>
                  ) : (
                    <div style={{ fontSize: '13px', color: '#6B7A9E', marginTop: '0.5rem' }}>No one yet</div>
                  )}
                </div>

                {currentProfile && (() => {
                  const myRank = filtered.findIndex(u => u.username === currentProfile.username) + 1;
                  return (
                    <div className={`${styles.sideCard} ${styles.sideCardCta}`}>
                      {myRank > 0 ? (
                        <>
                          <div className={styles.myRankTitle}>Your rank: <span style={{ color: '#3B82F6' }}>#{myRank}</span></div>
                          <div className={styles.myRankSub}>Keep winning battles to climb the ranks</div>
                        </>
                      ) : (
                        <>
                          <div className={styles.myRankTitle}>You're not ranked yet</div>
                          <div className={styles.myRankSub}>Enable leaderboard visibility in Settings to appear here</div>
                        </>
                      )}
                      <Link href="/battle/start" className={styles.startBattleBtn}>Start a Battle →</Link>
                    </div>
                  );
                })()}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
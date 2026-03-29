'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '../supabase';
import styles from './search.module.css';

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [following, setFollowing] = useState({}); // { username: bool }
  const [followLoading, setFollowLoading] = useState({});
  const inputRef = useRef(null);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        // Load who this user is already following
        const { data: followData } = await supabase
          .from('follows')
          .select('following_username')
          .eq('follower_id', currentUser.id);

        if (followData) {
          const map = {};
          followData.forEach(f => { map[f.following_username] = true; });
          setFollowing(map);
        }
      }
    }
    init();
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) { setResults([]); return; }

    const timer = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('username, full_name, bio, sport, avatar_url')
        .or(`username.ilike.%${trimmed}%,full_name.ilike.%${trimmed}%`)
        .limit(20);

      setResults(data || []);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  async function handleFollow(username) {
    if (!user) { window.location.href = '/login'; return; }
    if (followLoading[username]) return;

    setFollowLoading(prev => ({ ...prev, [username]: true }));

    if (following[username]) {
      setFollowing(prev => ({ ...prev, [username]: false }));
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_username', username);
    } else {
      setFollowing(prev => ({ ...prev, [username]: true }));
      await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_username: username });
    }

    setFollowLoading(prev => ({ ...prev, [username]: false }));
  }

  const sportMap = { nba: 'NBA', nfl: 'NFL', soccer: 'Soccer', mlb: 'MLB', nhl: 'NHL', all: 'All Sports' };

  return (
    <main className={styles.main}>
      <div className={styles.page}>

        <div className={styles.searchHeader}>
          <h1 className={styles.title}>Find Debaters</h1>
          <p className={styles.sub}>Search by name or username</p>
        </div>

        <div className={styles.searchBarWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            ref={inputRef}
            className={styles.searchInput}
            type="text"
            placeholder="Search users..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button className={styles.clearBtn} onClick={() => setQuery('')}>✕</button>
          )}
        </div>

        <div className={styles.results}>
          {loading && (
            <div className={styles.status}>Searching...</div>
          )}

          {!loading && query && results.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🤷</div>
              <div className={styles.emptyTitle}>No users found</div>
              <p className={styles.emptySub}>Try a different name or username</p>
            </div>
          )}

          {!loading && !query && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>👥</div>
              <div className={styles.emptyTitle}>Search for fans</div>
              <p className={styles.emptySub}>Find debaters by name or @username and follow them</p>
            </div>
          )}

          {results.map(profile => {
            const initials = profile.full_name
              ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
              : profile.username.slice(0, 2).toUpperCase();
            const sport = sportMap[profile.sport?.toLowerCase()] || null;
            const isMe = user && profile.username === user.user_metadata?.username;

            return (
              <div key={profile.username} className={styles.resultCard}>
                <Link href={`/profile/${profile.username}`} className={styles.resultLeft}>
                  <div className={styles.resultAv} style={{ background: '#3B82F6' }}>
                    {profile.avatar_url
                      ? <img src={profile.avatar_url} alt={profile.username} className={styles.resultAvImg} />
                      : initials
                    }
                  </div>
                  <div className={styles.resultInfo}>
                    <div className={styles.resultName}>{profile.full_name || profile.username}</div>
                    <div className={styles.resultHandle}>@{profile.username}</div>
                    {sport && <div className={styles.resultSport}>{sport}</div>}
                    {profile.bio && <div className={styles.resultBio}>{profile.bio}</div>}
                  </div>
                </Link>

                {!isMe && (
                  <button
                    className={`${styles.followBtn} ${following[profile.username] ? styles.followingBtn : ''}`}
                    onClick={() => handleFollow(profile.username)}
                    disabled={!!followLoading[profile.username]}
                  >
                    {followLoading[profile.username]
                      ? '...'
                      : following[profile.username] ? '✓ Following' : '+ Follow'
                    }
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
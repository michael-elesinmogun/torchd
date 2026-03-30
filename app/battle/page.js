'use client';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../supabase';
import styles from './battle.module.css';

export default function Battle() {
  const router = useRouter();
  const [openChallenges, setOpenChallenges] = useState([]);
  const [liveBattles, setLiveBattles] = useState([]);
  const [recentBattles, setRecentBattles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authReady, setAuthReady] = useState(false); // wait for session check
  const [accepting, setAccepting] = useState(null);
  const [acceptError, setAcceptError] = useState('');

  const [now, setNow] = useState(Date.now());
  const tickRef = useRef(null);

  useEffect(() => {
    tickRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tickRef.current);
  }, []);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', currentUser.id)
          .maybeSingle();
        setProfile(profileData);
      }

      setAuthReady(true); // session is now known
      await loadBattles();
      setLoading(false);
    }
    init();
  }, []);

  async function loadBattles() {
    const nowIso = new Date().toISOString();
    const [{ data: challenges }, { data: live }, { data: ended }] = await Promise.all([
      supabase.from('battles').select('*').eq('status', 'seeking').gt('expires_at', nowIso).order('created_at', { ascending: false }).limit(20),
      supabase.from('battles').select('*').eq('status', 'live').order('created_at', { ascending: false }).limit(10),
      supabase.from('battles').select('*').eq('status', 'ended').not('winner', 'is', null).order('ended_at', { ascending: false }).limit(5),
    ]);
    setOpenChallenges(challenges || []);
    setLiveBattles(live || []);
    setRecentBattles(ended || []);
  }

  async function acceptChallenge(battle) {
    // Auth guard — only fires after session is confirmed
    if (!authReady) return;

    if (!user || !profile) {
      // Store battle id in sessionStorage so we can auto-accept after login
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('pendingAccept', battle.id);
      }
      router.push('/login?redirect=/battle');
      return;
    }

    // Can't accept your own challenge
    if (profile.username === battle.player1_username) return;

    setAcceptError('');
    setAccepting(battle.id);

    try {
      const p1IsFor = battle.player1_stance?.startsWith('FOR');
      const p2Stance = p1IsFor
        ? `AGAINST — ${battle.topic.slice(0, 40)}`
        : `FOR — ${battle.topic.slice(0, 40)}`;

      const { data, error } = await supabase
        .from('battles')
        .update({ player2_username: profile.username, player2_stance: p2Stance, status: 'live' })
        .eq('id', battle.id)
        .eq('status', 'seeking')
        .select()
        .maybeSingle();

      if (error) throw new Error(error.message);

      if (!data) {
        setAcceptError('This challenge was just taken. Browse for another one.');
        setAccepting(null);
        await loadBattles();
        return;
      }

      // Notify player1
      const { data: p1Profile } = await supabase
        .from('profiles').select('id').eq('username', battle.player1_username).maybeSingle();

      if (p1Profile) {
        await supabase.from('notifications').insert({
          user_id: p1Profile.id,
          type: 'battle_accepted',
          message: `@${profile.username} accepted your battle challenge`,
          from_username: profile.username,
        });
      }

      router.push(`/battle/room/${battle.id}`);
    } catch (err) {
      setAcceptError(err.message);
      setAccepting(null);
    }
  }

  // After login redirect back, check if there's a pending accept
  useEffect(() => {
    if (!authReady || !user || !profile) return;
    const pendingId = sessionStorage.getItem('pendingAccept');
    if (!pendingId) return;
    sessionStorage.removeItem('pendingAccept');
    // Find the battle and auto-accept
    const battle = openChallenges.find(b => b.id === pendingId);
    if (battle) acceptChallenge(battle);
  }, [authReady, user, profile, openChallenges]);

  function formatTimeLeft(expiresAt) {
    const left = Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000));
    return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  }

  function getTimerColor(expiresAt) {
    const left = Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000));
    if (left <= 60) return '#EF4444';
    if (left <= 180) return '#F59E0B';
    return '#6B7A9E';
  }

  return (
    <main className={styles.main}>
      <div className={styles.page}>

        {/* Hero */}
        <div className={styles.hero}>
          <div className={styles.heroBg}></div>
          <div className={styles.heroInner}>
            <div className={styles.eyebrow}>
              <span className={styles.liveDot}></span> Battle Mode
            </div>
            <h1 className={styles.heroTitle}>Debate live.<br />Let the crowd decide.</h1>
            <p className={styles.heroSub}>Pick a topic, choose your stance, and go head-to-head on camera with someone who disagrees. Real people. Real takes. Live votes.</p>
            <div className={styles.heroActions}>
              <Link href="/battle/start" className={styles.startBtn}>⚔️ Post a Challenge</Link>
              {!user && <Link href="/signup" className={styles.signupBtn}>Create free account →</Link>}
            </div>
          </div>
        </div>

        {acceptError && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: '#F87171' }}>
            {acceptError}
          </div>
        )}

        {/* Open Challenges */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <span className={styles.liveDot} style={{ background: '#F59E0B' }}></span> Open Challenges
            </div>
            <Link href="/battle/start" className={styles.sectionLink}>Post your own →</Link>
          </div>

          {loading ? (
            <div className={styles.loadingState}>Loading challenges...</div>
          ) : openChallenges.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🎯</div>
              <div className={styles.emptyTitle}>No open challenges right now</div>
              <p className={styles.emptyBody}>Be the first to post one. Your challenge stays live for 10 minutes.</p>
              <Link href="/battle/start" className={styles.emptyBtn}>Post the first challenge →</Link>
            </div>
          ) : (
            <div className={styles.battlesList}>
              {openChallenges.map(battle => {
                const isOwn = profile?.username === battle.player1_username;
                const timeLeft = formatTimeLeft(battle.expires_at);
                const timerColor = getTimerColor(battle.expires_at);

                return (
                  <div key={battle.id} className={styles.challengeCard}>
                    <div className={styles.challengeCardLeft}>
                      <div className={styles.challengeTopRow}>
                        <div className={styles.challengeBadge}>
                          <span style={{ color: '#F59E0B' }}>◎</span> Open Challenge
                        </div>
                        <div className={styles.challengeTimer} style={{ color: timerColor }}>
                          ⏱ {timeLeft}
                        </div>
                      </div>
                      <div className={styles.battleTopic}>"{battle.topic}"</div>
                      <div className={styles.challengeStance}>
                        <span className={styles.battlePlayer}>@{battle.player1_username}</span>
                        <span style={{
                          fontSize: '11px', fontWeight: 700,
                          color: battle.player1_stance?.startsWith('FOR') ? '#60A5FA' : '#F87171',
                          background: battle.player1_stance?.startsWith('FOR') ? 'rgba(59,130,246,0.1)' : 'rgba(239,68,68,0.1)',
                          border: `1px solid ${battle.player1_stance?.startsWith('FOR') ? 'rgba(59,130,246,0.22)' : 'rgba(239,68,68,0.22)'}`,
                          borderRadius: '100px', padding: '2px 9px',
                        }}>
                          {battle.player1_stance?.startsWith('FOR') ? 'FOR ✊' : 'AGAINST 🚫'}
                        </span>
                        <span style={{ fontSize: '12px', color: '#3D4A66' }}>
                          · needs someone {battle.player1_stance?.startsWith('FOR') ? 'AGAINST' : 'FOR'}
                        </span>
                      </div>
                    </div>
                    <div>
                      {isOwn ? (
                        <div className={styles.ownChallengeBadge}>Your challenge</div>
                      ) : !authReady || (!user && authReady) ? (
                        // Not logged in — show sign in link instead of button
                        <Link
                          href="/login?redirect=/battle"
                          className={styles.acceptBtn}
                          style={{ textDecoration: 'none', display: 'inline-block' }}
                        >
                          Sign in to accept →
                        </Link>
                      ) : (
                        <button
                          className={styles.acceptBtn}
                          onClick={() => acceptChallenge(battle)}
                          disabled={accepting === battle.id}
                        >
                          {accepting === battle.id ? 'Accepting...' : 'Accept →'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Now */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <span className={styles.liveDot}></span> Live Now
            </div>
          </div>
          {loading ? (
            <div className={styles.loadingState}>Loading live battles...</div>
          ) : liveBattles.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>⚔️</div>
              <div className={styles.emptyTitle}>No live battles right now</div>
              <p className={styles.emptyBody}>Accept an open challenge to start one.</p>
            </div>
          ) : (
            <div className={styles.battlesList}>
              {liveBattles.map(battle => (
                <Link href={`/battle/room/${battle.id}`} key={battle.id} className={styles.battleCard}>
                  <div className={styles.battleCardLeft}>
                    <div className={styles.battleLiveBadge}><span className={styles.liveDotSmall}></span> LIVE</div>
                    <div className={styles.battleTopic}>"{battle.topic}"</div>
                    <div className={styles.battlePlayers}>
                      <span className={styles.battlePlayer}>@{battle.player1_username}</span>
                      <span className={styles.battleVs}>vs</span>
                      <span className={styles.battlePlayer}>@{battle.player2_username}</span>
                    </div>
                  </div>
                  <div className={styles.watchBtn}>Watch →</div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent results */}
        {recentBattles.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>🏆 Recent results</div>
            </div>
            <div className={styles.battlesList}>
              {recentBattles.map(battle => (
                <Link href={`/battle/room/${battle.id}`} key={battle.id} className={styles.battleCard}>
                  <div className={styles.battleCardLeft}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.22)', borderRadius: '100px', padding: '3px 10px', marginBottom: '6px' }}>
                      🏆 {battle.winner === 'tie' ? 'TIE' : `@${battle.winner} won`}
                    </div>
                    <div className={styles.battleTopic}>"{battle.topic}"</div>
                    <div className={styles.battlePlayers}>
                      <span className={styles.battlePlayer}>@{battle.player1_username}</span>
                      <span className={styles.battleVs}>vs</span>
                      <span className={styles.battlePlayer}>@{battle.player2_username}</span>
                    </div>
                  </div>
                  <div className={styles.watchBtn}>Replay →</div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* How it works */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>How it works</div>
          </div>
          <div className={styles.howGrid}>
            {[
              { num: '1', title: 'Post a challenge', body: 'Pick a topic, choose your stance. Your challenge goes live for 10 minutes.' },
              { num: '2', title: 'Someone accepts', body: 'Another user takes the opposing side. You both get matched instantly.' },
              { num: '3', title: '3 rounds, 2 minutes each', body: 'Round 1 you speak, Round 2 they speak, Round 3 open mic.' },
              { num: '4', title: 'Let the crowd vote', body: 'Live viewers vote on who makes the better argument. Most votes wins.' },
            ].map((step, i) => (
              <div key={i} className={styles.howCard}>
                <div className={styles.howNum}>{step.num}</div>
                <div className={styles.howTitle}>{step.title}</div>
                <p className={styles.howBody}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.cta}>
          <h2 className={styles.ctaTitle}>Ready to prove your take?</h2>
          <p className={styles.ctaSub}>Post a challenge in under 60 seconds.</p>
          <Link href="/battle/start" className={styles.startBtn}>⚔️ Post a Challenge</Link>
        </div>

      </div>
    </main>
  );
}
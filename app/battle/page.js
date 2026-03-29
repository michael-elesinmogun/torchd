'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import styles from './battle.module.css';

export default function Battle() {
  const [battles, setBattles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      const { data } = await supabase
        .from('battles')
        .select('*')
        .eq('status', 'live')
        .order('created_at', { ascending: false })
        .limit(10);

      setBattles(data || []);
      setLoading(false);
    }
    init();
  }, []);

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
              <Link href="/battle/start" className={styles.startBtn}>
                ⚔️ Start a Battle
              </Link>
              {!user && (
                <Link href="/signup" className={styles.signupBtn}>
                  Create free account →
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Live battles */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <span className={styles.liveDot}></span> Live battles
            </div>
            <Link href="/battle/start" className={styles.sectionLink}>Start your own →</Link>
          </div>

          {loading ? (
            <div className={styles.loadingState}>Loading live battles...</div>
          ) : battles.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>⚔️</div>
              <div className={styles.emptyTitle}>No live battles right now</div>
              <p className={styles.emptyBody}>Be the first to start one. Pick a topic and challenge someone to debate you live.</p>
              <Link href="/battle/start" className={styles.emptyBtn}>Start the first battle →</Link>
            </div>
          ) : (
            <div className={styles.battlesList}>
              {battles.map(battle => (
                <Link href={`/battle/room/${battle.id}`} key={battle.id} className={styles.battleCard}>
                  <div className={styles.battleCardLeft}>
                    <div className={styles.battleLiveBadge}>
                      <span className={styles.liveDotSmall}></span> LIVE
                    </div>
                    <div className={styles.battleTopic}>"{battle.topic}"</div>
                    <div className={styles.battlePlayers}>
                      {battle.player1_username && (
                        <span className={styles.battlePlayer}>@{battle.player1_username}</span>
                      )}
                      {battle.player1_username && battle.player2_username && (
                        <span className={styles.battleVs}>vs</span>
                      )}
                      {battle.player2_username ? (
                        <span className={styles.battlePlayer}>@{battle.player2_username}</span>
                      ) : (
                        <span className={styles.battleWaiting}>Waiting for opponent...</span>
                      )}
                    </div>
                  </div>
                  <div className={styles.watchBtn}>Watch →</div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* How it works */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>How it works</div>
          </div>
          <div className={styles.howGrid}>
            {[
              { num: '1', title: 'Pick a topic', body: 'Choose from hot sports debates or write your own.' },
              { num: '2', title: 'Choose your stance', body: 'Are you FOR or AGAINST? Own your take.' },
              { num: '3', title: 'Go live', body: 'Share your room link. Your opponent joins, cameras on, debate starts.' },
              { num: '4', title: 'Let the crowd vote', body: 'Live viewers vote on who makes the better argument. Best takes win.' },
            ].map((step, i) => (
              <div key={i} className={styles.howCard}>
                <div className={styles.howNum}>{step.num}</div>
                <div className={styles.howTitle}>{step.title}</div>
                <p className={styles.howBody}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className={styles.cta}>
          <h2 className={styles.ctaTitle}>Ready to prove your take?</h2>
          <p className={styles.ctaSub}>Start a battle in under 60 seconds.</p>
          <Link href="/battle/start" className={styles.startBtn}>⚔️ Start a Battle</Link>
        </div>

      </div>
    </main>
  );
}
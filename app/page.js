'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './supabase';
import styles from './landing.module.css';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) router.replace('/lobby');
    });
  }, []);

  return (
    <main className={styles.main}>

      {/* NAV */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.navLogo}>
            <span className={styles.flame}>🔥</span>
            <span className={styles.logoText}>Torchd</span>
          </Link>
          <div className={styles.navLinks}>
            <Link href="/lobby" className={styles.navLink}>Game Lobby</Link>
            <Link href="/leaderboard" className={styles.navLink}>Leaderboard</Link>
            <Link href="/login" className={styles.navCta}>Sign up free</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.eyebrow}>
            <span className={styles.liveDot}></span>
            Live debates. Real sports fans.
          </div>
          <h1 className={styles.heroTitle}>
            Your take is worth<br className={styles.heroBreak} />
            <span className={styles.heroAccent}> fighting for.</span>
          </h1>
          <p className={styles.heroSub}>
            Get on camera. Pick a stance. Debate live against someone who disagrees.
            The crowd votes. Your rank rises. This is Torchd.
          </p>
          <div className={styles.heroCtas}>
            <Link href="/signup" className={styles.ctaPrimary}>Start debating free →</Link>
            <Link href="/lobby" className={styles.ctaSecondary}>Watch live games</Link>
          </div>
          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <span className={styles.heroStatNum}>Live</span>
              <span className={styles.heroStatLabel}>game watch parties</span>
            </div>
            <div className={styles.heroStatDivider}></div>
            <div className={styles.heroStat}>
              <span className={styles.heroStatNum}>Real</span>
              <span className={styles.heroStatLabel}>camera debates</span>
            </div>
            <div className={styles.heroStatDivider}></div>
            <div className={styles.heroStat}>
              <span className={styles.heroStatNum}>You</span>
              <span className={styles.heroStatLabel}>decide who wins</span>
            </div>
          </div>
        </div>

        {/* Static visual — no fake data */}
        <div className={styles.heroVisual}>
          <div className={styles.visualCard}>
            <div className={styles.visualTop}>
              <span className={styles.visualTag}>⚔️ Battle Mode</span>
              <span className={styles.visualTag}>⚾ Game Lobby</span>
              <span className={styles.visualTag}>🏆 Leaderboard</span>
            </div>
            <div className={styles.visualCenter}>
              <div className={styles.visualIcon}>🔥</div>
              <div className={styles.visualHeadline}>Prove your takes live on camera</div>
              <div className={styles.visualSub}>Real debates. Real stakes. Real fans decide.</div>
            </div>
            <div className={styles.visualBottom}>
              <div className={styles.visualStep}>
                <div className={styles.visualStepDot} style={{background:'#3B82F6'}}></div>
                <span>Pick a topic</span>
              </div>
              <div className={styles.visualStepLine}></div>
              <div className={styles.visualStep}>
                <div className={styles.visualStepDot} style={{background:'#8B5CF6'}}></div>
                <span>Go live</span>
              </div>
              <div className={styles.visualStepLine}></div>
              <div className={styles.visualStep}>
                <div className={styles.visualStepDot} style={{background:'#10B981'}}></div>
                <span>Win the crowd</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionEyebrow}>How it works</div>
          <h2 className={styles.sectionTitle}>Three steps to prove your take</h2>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNum}>01</div>
              <div className={styles.stepIcon}>🎯</div>
              <h3 className={styles.stepTitle}>Pick your stance</h3>
              <p className={styles.stepBody}>Choose a hot sports topic and pick a side. Agree or disagree — just be ready to defend it.</p>
            </div>
            <div className={styles.stepArrow}>→</div>
            <div className={styles.step}>
              <div className={styles.stepNum}>02</div>
              <div className={styles.stepIcon}>🎥</div>
              <h3 className={styles.stepTitle}>Debate on camera</h3>
              <p className={styles.stepBody}>Get matched with someone who disagrees. Go live. Make your case. No scripts, no edits.</p>
            </div>
            <div className={styles.stepArrow}>→</div>
            <div className={styles.step}>
              <div className={styles.stepNum}>03</div>
              <div className={styles.stepIcon}>🏆</div>
              <h3 className={styles.stepTitle}>The crowd decides</h3>
              <p className={styles.stepBody}>Live viewers vote in real time. Win the crowd, win the debate. Climb the leaderboard.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className={styles.sectionDark}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionEyebrow} style={{color:'#60A5FA'}}>Built for sports fans</div>
          <h2 className={styles.sectionTitle} style={{color:'#EEF2FF'}}>More than just debate</h2>
          <div className={styles.features}>
            {[
              { icon: '⚾', title: 'Live game lobby', body: 'Follow live play-by-play, box scores, and team stats for every MLB, NBA, NFL, and NHL game.' },
              { icon: '📹', title: 'Watch parties', body: 'React on camera with other fans watching the same game live. Like a sports bar, without leaving your couch.' },
              { icon: '📊', title: 'Rankings & rep', body: 'Every win builds your record. Climb the global leaderboard. Prove you\'re not just a fan — you\'re right.' },
              { icon: '🔥', title: 'Hot takes, settled', body: 'The debates that dominate your timeline — GOAT arguments, choke jobs, overrated takes — finally have a verdict.' },
            ].map((f, i) => (
              <div key={i} className={styles.feature}>
                <div className={styles.featureIcon}>{f.icon}</div>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureBody}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TOPICS */}
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionEyebrow}>What people debate</div>
          <h2 className={styles.sectionTitle}>The takes that start wars</h2>
          <div className={styles.topics}>
            {[
              { topic: 'Mahomes has already surpassed Brady', sport: 'NFL' },
              { topic: 'LeBron is the greatest of all time', sport: 'NBA' },
              { topic: 'The Yankees will win the World Series', sport: 'MLB' },
              { topic: 'Gretzky is untouchable as the GOAT', sport: 'NHL' },
              { topic: 'Steph Curry changed basketball forever', sport: 'NBA' },
              { topic: 'Analytics have made baseball boring', sport: 'MLB' },
            ].map((t, i) => (
              <Link key={i} href="/signup" className={styles.topic}>
                <div className={styles.topicLeft}>
                  <span className={styles.topicSport}>{t.sport}</span>
                  <span className={styles.topicText}>"{t.topic}"</span>
                </div>
                <span className={styles.topicDebate}>Debate this →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.ctaSection}>
        <div className={styles.sectionInner}>
          <h2 className={styles.ctaTitle}>Your takes deserve a verdict.</h2>
          <p className={styles.ctaSub}>Sign up free. No credit card. Start debating in 60 seconds.</p>
          <Link href="/signup" className={styles.ctaPrimary} style={{fontSize:'18px', padding:'16px 40px'}}>
            Create your account →
          </Link>
          <p className={styles.ctaFine}>Already have an account? <Link href="/login" style={{color:'#60A5FA', textDecoration:'none'}}>Sign in</Link></p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerLogo}>
            <span className={styles.flame}>🔥</span>
            <span className={styles.logoText}>Torchd</span>
          </div>
          <div className={styles.footerLinks}>
            <Link href="/lobby" className={styles.footerLink}>Game Lobby</Link>
            <Link href="/battle" className={styles.footerLink}>Battle Mode</Link>
            <Link href="/leaderboard" className={styles.footerLink}>Leaderboard</Link>
            <Link href="/login" className={styles.footerLink}>Sign in</Link>
          </div>
          <p className={styles.footerCopy}>© 2026 Torchd. All rights reserved.</p>
        </div>
      </footer>

    </main>
  );
}
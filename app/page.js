import Link from 'next/link';
import styles from './landing.module.css';

export default function Home() {
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
            Your take is<br />
            <span className={styles.heroAccent}>worth fighting for.</span>
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

        {/* Mock battle card */}
        <div className={styles.heroVisual}>
          <div className={styles.battleCard}>
            <div className={styles.battleCardTop}>
              <span className={styles.battleLive}>🔴 LIVE</span>
              <span className={styles.battleVotes}>247 watching</span>
            </div>
            <div className={styles.battleTopic}>"Mahomes has already surpassed Brady"</div>
            <div className={styles.battlePlayers}>
              <div className={styles.battlePlayer}>
                <div className={styles.playerAvatar} style={{background:'#3B82F6'}}>MJ</div>
                <div className={styles.playerInfo}>
                  <div className={styles.playerName}>@mikeelesin</div>
                  <div className={styles.playerStance}>FOR</div>
                </div>
                <div className={styles.playerVotes} style={{color:'#10B981'}}>61%</div>
              </div>
              <div className={styles.battleVs}>VS</div>
              <div className={styles.battlePlayer}>
                <div className={styles.playerAvatar} style={{background:'#8B5CF6'}}>JS</div>
                <div className={styles.playerInfo}>
                  <div className={styles.playerName}>@johnsmith</div>
                  <div className={styles.playerStance}>AGAINST</div>
                </div>
                <div className={styles.playerVotes} style={{color:'#EF4444'}}>39%</div>
              </div>
            </div>
            <div className={styles.voteBar}>
              <div className={styles.voteBarFill} style={{width:'61%'}}></div>
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
            <div className={styles.feature}>
              <div className={styles.featureIcon}>⚾</div>
              <h3 className={styles.featureTitle}>Live game lobby</h3>
              <p className={styles.featureBody}>Follow along with live play-by-play, box scores, and team stats for every MLB, NBA, NFL, and NHL game.</p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>📹</div>
              <h3 className={styles.featureTitle}>Watch parties</h3>
              <p className={styles.featureBody}>React on camera with other fans watching the same game live. Like a sports bar, but you're actually there.</p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>📊</div>
              <h3 className={styles.featureTitle}>Rankings & rep</h3>
              <p className={styles.featureBody}>Every win builds your record. Climb the global leaderboard. Prove you're not just a fan — you're right.</p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>🔥</div>
              <h3 className={styles.featureTitle}>Hot takes, settled</h3>
              <p className={styles.featureBody}>The debates that dominate your timeline — who's the GOAT, who choked, who's overrated — finally have a verdict.</p>
            </div>
          </div>
        </div>
      </section>

      {/* TOPICS */}
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionEyebrow}>Trending debates</div>
          <h2 className={styles.sectionTitle}>What are people arguing about?</h2>
          <div className={styles.topics}>
            {[
              { topic: 'Mahomes has already surpassed Brady', sport: 'NFL', hot: true },
              { topic: 'LeBron is the greatest of all time', sport: 'NBA', hot: true },
              { topic: 'The Yankees will win the World Series', sport: 'MLB', hot: false },
              { topic: 'Gretzky is untouchable as the GOAT', sport: 'NHL', hot: false },
              { topic: 'Steph Curry changed basketball forever', sport: 'NBA', hot: true },
              { topic: 'Analytics have made baseball boring', sport: 'MLB', hot: false },
            ].map((t, i) => (
              <Link key={i} href="/signup" className={styles.topic}>
                <div className={styles.topicLeft}>
                  <span className={styles.topicSport}>{t.sport}</span>
                  <span className={styles.topicText}>"{t.topic}"</span>
                </div>
                <div className={styles.topicRight}>
                  {t.hot && <span className={styles.topicHot}>🔥 Hot</span>}
                  <span className={styles.topicDebate}>Debate this →</span>
                </div>
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
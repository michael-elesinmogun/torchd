'use client';
import Link from 'next/link';
import styles from './page.module.css';
 
export default function Home() {
  return (
    <main className={styles.main}>
 
      {/* NAV */}
      <nav className={styles.nav}>
        <Link href="/" className={styles.logo}>🔥 Torchd</Link>
        <ul className={styles.navLinks}>
          <li><Link href="/battle">Battle Mode</Link></li>
          <li><Link href="/lobby">Game Lobby</Link></li>
          <li><Link href="/leaderboard">Leaderboard</Link></li>
        </ul>
        <div className={styles.navActions}>
          <Link href="/login" className={styles.btnGhost}>Sign in</Link>
          <Link href="/signup" className={styles.btnPrimary}>Create Account →</Link>
        </div>
      </nav>
 
      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroGrid}></div>
        <div className={styles.heroBgGlow}></div>
 
        <div className={styles.heroEyebrow}>
          <span className={styles.eyebrowDot}></span>
          Now open for early access
        </div>
 
        <h1 className={styles.heroH1}>
          Stop tweeting.<br />
          Start <span className={styles.blue}>debating</span>.<br />
          <span className={styles.stroke}>On camera.</span>
        </h1>
 
        <p className={styles.heroSub}>
          <strong>Torchd</strong> is the live video debate platform for sports fans. Go head-to-head with real people, in real time — with a crowd deciding who wins.
        </p>
 
        <div className={styles.heroActions}>
          <Link href="/signup" className={styles.heroBtnPrimary}>Create Free Account →</Link>
          <Link href="/battle" className={styles.heroBtnSecondary}>▶ Watch a live battle</Link>
        </div>
 
        <div className={styles.socialProof}>
          <div className={styles.proofAvatars}>
            <div className={styles.proofAv} style={{background:'#3B82F6'}}>JK</div>
            <div className={styles.proofAv} style={{background:'#10B981'}}>SR</div>
            <div className={styles.proofAv} style={{background:'#F59E0B'}}>TW</div>
            <div className={styles.proofAv} style={{background:'#EF4444'}}>DM</div>
            <div className={styles.proofAv} style={{background:'#8B5CF6'}}>AL</div>
          </div>
          <span className={styles.proofText}><strong>2,400+ fans</strong> already on Torchd</span>
        </div>
      </section>
 
      {/* TICKER */}
      <div className={styles.tickerWrap}>
        <div className={styles.tickerLabel}>Hot debates right now</div>
        <div className={styles.tickerTrack}>
          {[
            {tag:'NBA', text:'Is LeBron the GOAT?'},
            {tag:'NFL', text:'Mahomes already passed Brady'},
            {tag:'🔥 HOT', text:'Celtics dynasty or one-year wonder?'},
            {tag:'NBA', text:'Wembanyama > Embiid right now'},
            {tag:'NFL', text:'Ravens should have gone to the Super Bowl'},
            {tag:'🔥 HOT', text:'NFL officiating is broken'},
            {tag:'NBA', text:'Steph Curry is the most underrated GOAT'},
            {tag:'NFL', text:'Lamar Jackson is the best QB in football today'},
            {tag:'NBA', text:'Is LeBron the GOAT?'},
            {tag:'NFL', text:'Mahomes already passed Brady'},
            {tag:'🔥 HOT', text:'Celtics dynasty or one-year wonder?'},
            {tag:'NBA', text:'Wembanyama > Embiid right now'},
            {tag:'NFL', text:'Ravens should have gone to the Super Bowl'},
            {tag:'🔥 HOT', text:'NFL officiating is broken'},
            {tag:'NBA', text:'Steph Curry is the most underrated GOAT'},
            {tag:'NFL', text:'Lamar Jackson is the best QB in football today'},
          ].map((item, i) => (
            <div key={i} className={styles.tickerItem}>
              <span className={`${styles.tickerTag} ${item.tag==='NFL' ? styles.tagRed : item.tag.includes('HOT') ? styles.tagAmber : styles.tagBlue}`}>{item.tag}</span>
              {item.text}
            </div>
          ))}
        </div>
      </div>
 
      {/* MODES */}
      <section className={styles.modesSection}>
        <div className={styles.container}>
          <div className={styles.eyebrow}><span className={styles.eyebrowDot}></span> Two ways to play</div>
          <h2 className={styles.h2}>Pick your battle format</h2>
          <div className={styles.modesGrid}>
            <Link href="/battle" className={`${styles.modeCard} ${styles.modeBattle}`}>
              <span className={styles.modeIcon}>⚔️</span>
              <div className={styles.modeTitle}>Battle Mode</div>
              <p className={styles.modeBody}>1-on-1 live video. Pick a topic, get matched with someone who disagrees, argue your case on camera. Live crowd votes on the winner. No script. No edits. Pure debate.</p>
              <div className={styles.modeLink} style={{color:'var(--blue)'}}>Go to Battle Mode →</div>
            </Link>
            <Link href="/lobby" className={`${styles.modeCard} ${styles.modeLobby}`}>
              <span className={styles.modeIcon}>🏟️</span>
              <div className={styles.modeTitle}>Game Lobby</div>
              <p className={styles.modeBody}>Jump into a live room tied to tonight's game. Get on camera, drop hot takes, upvote the best moments. It's a sports bar — but global, and on your screen.</p>
              <div className={styles.modeLink} style={{color:'var(--green)'}}>Go to Game Lobby →</div>
            </Link>
          </div>
        </div>
      </section>
 
      {/* STATS */}
      <div className={styles.statsBand}>
        <div className={styles.statsGrid}>
          <div className={styles.statBlock}><span className={styles.statNum}>80M+</span><div className={styles.statLabel}>Sports fans actively debating online in the US</div></div>
          <div className={styles.statBlock}><span className={styles.statNum}>$73B</span><div className={styles.statLabel}>Sports media market shifting to interactive formats</div></div>
          <div className={styles.statBlock}><span className={styles.statNum}>2,400+</span><div className={styles.statLabel}>Fans already on Torchd in early access</div></div>
          <div className={styles.statBlock}><span className={styles.statNum}>0</span><div className={styles.statLabel}>Other platforms doing what we do. Until now.</div></div>
        </div>
      </div>
 
      {/* FEATURES */}
      <section className={styles.featuresSection}>
        <div className={styles.container}>
          <div className={styles.eyebrow}><span className={styles.eyebrowDot}></span> Features</div>
          <h2 className={styles.h2}>Built for fans with real opinions</h2>
          <div className={styles.featuresGrid}>
            {[
              {icon:'🎯', title:'Stance-based matchmaking', body:'We find you someone who genuinely disagrees. No echo chambers. Real stakes, real debate.'},
              {icon:'📊', title:'Live audience voting', body:'The crowd decides — in real time. Hundreds of fans watch and vote as you argue your case.'},
              {icon:'🏆', title:'Rankings & leaderboards', body:'Win debates. Earn points. Climb the global leaderboard and build your rep.'},
              {icon:'✂️', title:'Shareable highlight clips', body:'Your best moments auto-clipped and ready to post. Go viral for being right, not just loud.'},
              {icon:'🔥', title:'AI topic engine', body:'Topics generated from live game moments. Bad call just happened? There\'s a debate room for that.'},
              {icon:'🌍', title:'Global fan base', body:'Debate fans from Boston to Lagos to London. Every sport, every team, every take — covered.'},
            ].map((f, i) => (
              <div key={i} className={styles.featCard}>
                <span className={styles.featIcon}>{f.icon}</span>
                <div className={styles.featTitle}>{f.title}</div>
                <p className={styles.featBody}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
 
      {/* LIVE BATTLES */}
      <section className={styles.liveSection}>
        <div className={styles.container}>
          <div className={styles.eyebrow}><span className={styles.liveDot}></span> Live now</div>
          <h2 className={styles.h2}>Battles happening right now</h2>
          <div className={styles.battlesList}>
            {[
              {tag:'NBA', title:'"LeBron James is the greatest basketball player of all time"', p1:'Jordan K.', p2:'Darius W.', pct:62},
              {tag:'NFL', title:'"Patrick Mahomes has already surpassed Tom Brady as the GOAT QB"', p1:'Marcus T.', p2:'Lisa R.', pct:55},
              {tag:'NBA', title:'"The Boston Celtics are building a legitimate dynasty"', p1:'Keisha B.', p2:'Ryan O.', pct:71},
            ].map((b, i) => (
              <Link href="/battle" key={i} className={styles.battleRow}>
                <div className={`${styles.tag} ${b.tag==='NFL' ? styles.tagRed : styles.tagBlue}`}>{b.tag}</div>
                <div className={styles.battleTopic}>
                  <div className={styles.battleTitle}>{b.title}</div>
                  <div className={styles.battleMeta}>
                    <span>{b.p1} vs {b.p2}</span>
                    <span className={styles.liveBadge}>● LIVE</span>
                  </div>
                </div>
                <div className={styles.battleVotes}>
                  <div className={styles.voteBar}>
                    <div className={styles.voteBlue} style={{width:`${b.pct}%`}}></div>
                    <div className={styles.voteRed} style={{width:`${100-b.pct}%`}}></div>
                  </div>
                  <div className={styles.votePcts}>
                    <span style={{color:'#60A5FA'}}>{b.pct}%</span>
                    <span style={{color:'#F87171'}}>{100-b.pct}%</span>
                  </div>
                </div>
                <div className={styles.watchBtn}>Watch →</div>
              </Link>
            ))}
          </div>
        </div>
      </section>
 
      {/* CTA */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaGlow}></div>
        <div className={styles.ctaInner}>
          <div className={styles.eyebrow} style={{justifyContent:'center'}}><span className={styles.eyebrowDot}></span> Join Torchd</div>
          <h2 className={styles.h2}>Your takes deserve a real stage</h2>
          <p className={styles.ctaBody}>Create your free account and start debating in minutes. No credit card. No download required.</p>
          <Link href="/signup" className={styles.heroBtnPrimary} style={{display:'inline-flex',marginTop:'2rem'}}>Create Free Account →</Link>
          <p className={styles.ctaNote}>Free forever · No spam · Cancel anytime</p>
        </div>
      </section>
 
      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div>
            <div className={styles.logo}>🔥 Torchd</div>
            <p className={styles.footerDesc}>Sports debate, reimagined. Go head-to-head with fans worldwide on live video.</p>
          </div>
          <div className={styles.footerCol}>
            <h4>Product</h4>
            <ul>
              <li><Link href="/battle">Battle Mode</Link></li>
              <li><Link href="/lobby">Game Lobby</Link></li>
              <li><Link href="/leaderboard">Leaderboard</Link></li>
              <li><Link href="/signup">Create Account</Link></li>
            </ul>
          </div>
          <div className={styles.footerCol}>
            <h4>Company</h4>
            <ul>
              <li><Link href="#">About</Link></li>
              <li><Link href="#">Blog</Link></li>
              <li><Link href="#">Careers</Link></li>
              <li><Link href="#">Press</Link></li>
            </ul>
          </div>
          <div className={styles.footerCol}>
            <h4>Legal</h4>
            <ul>
              <li><Link href="#">Privacy Policy</Link></li>
              <li><Link href="#">Terms of Service</Link></li>
              <li><a href="mailto:hello@torchd.app">Contact Us</a></li>
            </ul>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <div>© 2025 Torchd, Inc. All rights reserved.</div>
          <div>hello@torchd.app · torchd.app</div>
        </div>
      </footer>
 
    </main>
  );
}
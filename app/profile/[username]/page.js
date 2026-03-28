'use client';
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../supabase';
import styles from './profile.module.css';

const SPORTS = ['NBA', 'NFL', 'Soccer', 'MLB', 'NHL'];
const TEAMS = {
  NBA: ['Celtics', 'Lakers', 'Warriors', 'Bulls', 'Heat', 'Nets', 'Knicks', 'Suns', 'Bucks', 'Nuggets', 'Clippers', 'Mavs'],
  NFL: ['Chiefs', 'Eagles', 'Ravens', 'Cowboys', 'Patriots', '49ers', 'Packers', 'Bills', 'Bengals', 'Dolphins', 'Lions', 'Bears'],
  Soccer: ['Man City', 'Arsenal', 'Real Madrid', 'Barcelona', 'Liverpool', 'PSG', 'Bayern', 'Chelsea', 'Juventus', 'Inter Milan'],
  MLB: ['Yankees', 'Dodgers', 'Red Sox', 'Cubs', 'Mets', 'Braves', 'Astros', 'Giants', 'Cardinals', 'Phillies'],
  NHL: ['Bruins', 'Leafs', 'Rangers', 'Canadiens', 'Oilers', 'Penguins', 'Capitals', 'Avalanche', 'Lightning', 'Hurricanes'],
};

const SUGGESTED_TOPICS = {
  NBA: ['Is LeBron James the greatest of all time?', 'Steph Curry changed basketball forever', 'Wembanyama will be better than LeBron', 'The Celtics are building a real dynasty'],
  NFL: ['Mahomes has already surpassed Brady', 'Lamar Jackson is the best QB in football right now', 'The NFL needs an 18-game season', 'Ravens should have gone to the Super Bowl'],
  Soccer: ['Messi is the greatest footballer of all time', 'The Premier League is the best league in the world', 'VAR has ruined football', 'Man City have been the dominant force of this era'],
  MLB: ['The DH rule ruined baseball', 'Shohei Ohtani is the most valuable player in baseball history', 'Analytics have made baseball boring', 'The Yankees will win the World Series this year'],
  NHL: ['Gretzky is untouchable as the greatest of all time', 'The salary cap has killed dynasty teams', 'Sidney Crosby is the best player of his generation', 'The Bruins have been the model franchise of the last decade'],
};

export default function Profile({ params }) {
  const { username } = React.use(params);
  const fileInputRef = useRef(null);

  const [displayName, setDisplayName] = useState('');
  const [initials, setInitials] = useState('?');
  const [activeTab, setActiveTab] = useState('history');
  const [following, setFollowing] = useState(false);
  const [followCount, setFollowCount] = useState(0);
  const [editingSports, setEditingSports] = useState(false);
  const [favSports, setFavSports] = useState(['NBA', 'NFL']);
  const [favTeams, setFavTeams] = useState(['Celtics', 'Patriots']);
  const [bio, setBio] = useState('LeBron is the GOAT and I will debate anyone, anywhere, anytime. Come find me.');
  const [editingBio, setEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState(bio);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [checklist, setChecklist] = useState({
    addBio: true,
    pickTeams: true,
    firstBattle: false,
  });

  // Fetch real user data from Supabase
  useEffect(() => {
    async function fetchUser() {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (user) {
        const fullName = user.user_metadata?.full_name || '';
        setDisplayName(fullName || username);
        setInitials(
          fullName
            ? fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
            : username.slice(0, 2).toUpperCase()
        );
        // Set sport from signup
        const sport = user.user_metadata?.sport;
        if (sport && sport !== 'all') {
          const sportMap = { nba: 'NBA', nfl: 'NFL', soccer: 'Soccer', mlb: 'MLB', nhl: 'NHL' };
          const mappedSport = sportMap[sport];
          if (mappedSport) setFavSports([mappedSport]);
        }
      } else {
        // Not logged in — derive name from URL
        setDisplayName(
          username.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        );
        setInitials(username.slice(0, 2).toUpperCase());
      }
    }
    fetchUser();
  }, [username]);

  function toggleFollow() {
    setFollowing(!following);
    setFollowCount(f => following ? f - 1 : f + 1);
  }

  function toggleSport(sport) {
    setFavSports(prev => prev.includes(sport) ? prev.filter(s => s !== sport) : [...prev, sport]);
  }

  function toggleTeam(team) {
    setFavTeams(prev => prev.includes(team) ? prev.filter(t => t !== team) : [...prev, team]);
  }

  function saveBio() {
    setBio(bioInput);
    setEditingBio(false);
  }

  function shareProfile() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${username}-${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
    if (error) { console.error('Upload error:', error.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
    setPhotoUrl(urlData.publicUrl);
    setUploading(false);
  }

  const completedCount = Object.values(checklist).filter(Boolean).length;
  const totalCount = Object.keys(checklist).length;
  const progressPct = Math.round((completedCount / totalCount) * 100);
  const suggestedTopics = favSports.length > 0 ? SUGGESTED_TOPICS[favSports[0]] || [] : SUGGESTED_TOPICS['NBA'];
  const isNewUser = checklist.firstBattle === false;

  return (
    <main className={styles.main}>
      <div className={styles.page}>
        <div className={styles.layout}>

          {/* LEFT SIDEBAR */}
          <div className={styles.sidebar}>

            <div className={styles.profileCard}>
              <div className={styles.avatarWrap}>
                <div className={styles.avatarContainer} onClick={() => fileInputRef.current?.click()}>
                  {photoUrl
                    ? <img src={photoUrl} alt="Profile" className={styles.avatarImg} />
                    : <div className={styles.avatar}>{initials}</div>
                  }
                  <div className={styles.avatarOverlay}>{uploading ? '⏳' : '📷'}</div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
                <div className={styles.avatarHint}>Click to upload photo</div>
              </div>

              <div className={styles.profileName}>{displayName}</div>
              <div className={styles.profileHandle}>@{username}</div>
              <div className={styles.profileLocation}>📍 Boston, MA</div>

              {editingBio ? (
                <div className={styles.bioEditWrap}>
                  <textarea className={styles.bioTextarea} value={bioInput} onChange={e => setBioInput(e.target.value)} maxLength={160} rows={3} placeholder="Your take in one line..." autoFocus />
                  <div className={styles.bioEditActions}>
                    <span className={styles.bioCharCount}>{bioInput.length}/160</span>
                    <button className={styles.bioSaveBtn} onClick={saveBio}>Save</button>
                    <button className={styles.bioCancelBtn} onClick={() => { setEditingBio(false); setBioInput(bio); }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className={styles.bioWrap}>
                  <p className={styles.profileBio}>{bio}</p>
                  <button className={styles.editBioBtn} onClick={() => setEditingBio(true)}>Edit bio</button>
                </div>
              )}

              <div className={styles.followRow}>
                <div className={styles.followStat}>
                  <span className={styles.followNum}>{followCount}</span>
                  <span className={styles.followLabel}>Followers</span>
                </div>
                <div className={styles.followDivider}></div>
                <div className={styles.followStat}>
                  <span className={styles.followNum}>0</span>
                  <span className={styles.followLabel}>Following</span>
                </div>
              </div>

              <button className={`${styles.followBtn} ${following ? styles.followingBtn : ''}`} onClick={toggleFollow}>
                {following ? '✓ Following' : '+ Follow'}
              </button>
              <Link href="/battle" className={styles.challengeBtn}>⚔️ Challenge to a Battle</Link>
              <button className={styles.shareBtn} onClick={shareProfile}>
                {copied ? '✓ Link copied!' : '🔗 Share profile'}
              </button>
            </div>

            <div className={styles.sideCard}>
              <div className={styles.sideCardHeader}>
                <div className={styles.sideCardTitle}>Favorite Sports & Teams</div>
                <button className={styles.editBtn} onClick={() => setEditingSports(!editingSports)}>
                  {editingSports ? 'Done' : 'Edit'}
                </button>
              </div>
              {editingSports ? (
                <div className={styles.editSection}>
                  <div className={styles.editLabel}>Sports</div>
                  <div className={styles.sportsEditGrid}>
                    {SPORTS.map(sport => (
                      <button key={sport} className={`${styles.sportEditBtn} ${favSports.includes(sport) ? styles.sportEditSelected : ''}`} onClick={() => toggleSport(sport)}>{sport}</button>
                    ))}
                  </div>
                  {favSports.map(sport => (
                    <div key={sport}>
                      <div className={styles.editLabel}>{sport} Teams</div>
                      <div className={styles.teamsEditGrid}>
                        {TEAMS[sport]?.map(team => (
                          <button key={team} className={`${styles.teamEditBtn} ${favTeams.includes(team) ? styles.teamEditSelected : ''}`} onClick={() => toggleTeam(team)}>{team}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <div className={styles.sportBadges}>
                    {favSports.map(sport => <div key={sport} className={styles.sportBadge}>{sport}</div>)}
                  </div>
                  <div className={styles.teamBadges}>
                    {favTeams.map(team => <div key={team} className={styles.teamBadge}>🏆 {team}</div>)}
                  </div>
                </div>
              )}
            </div>

            <div className={styles.sideCard}>
              <div className={styles.sideCardTitle}>Stats</div>
              <div className={styles.statsGrid}>
                <div className={styles.statItem}><div className={styles.statNum} style={{color:'#3D4A66'}}>0</div><div className={styles.statLabel}>Battles</div></div>
                <div className={styles.statItem}><div className={styles.statNum} style={{color:'#3D4A66'}}>—</div><div className={styles.statLabel}>Win Rate</div></div>
                <div className={styles.statItem}><div className={styles.statNum} style={{color:'#3D4A66'}}>—</div><div className={styles.statLabel}>Rank</div></div>
                <div className={styles.statItem}><div className={styles.statNum} style={{color:'#3D4A66'}}>—</div><div className={styles.statLabel}>Streak</div></div>
              </div>
            </div>

          </div>

          {/* MAIN CONTENT */}
          <div className={styles.mainContent}>

            {isNewUser && (
              <div className={styles.onboardingSection}>
                <div className={styles.checklistCard}>
                  <div className={styles.checklistHeader}>
                    <div>
                      <div className={styles.checklistTitle}>Complete your profile</div>
                      <div className={styles.checklistSub}>{completedCount} of {totalCount} done</div>
                    </div>
                    <div className={styles.checklistPct}>{progressPct}%</div>
                  </div>
                  <div className={styles.progressTrack}>
                    <div className={styles.progressFill} style={{width: `${progressPct}%`}}></div>
                  </div>
                  <div className={styles.checklistItems}>
                    {[
                      { key: 'addBio', title: 'Add a bio', sub: 'Tell the world your take' },
                      { key: 'pickTeams', title: 'Pick your favorite teams', sub: 'So we can match you with the right opponents' },
                      { key: 'firstBattle', title: 'Start your first battle', sub: 'Prove your takes are built different' },
                    ].map(item => (
                      <div key={item.key} className={`${styles.checklistItem} ${checklist[item.key] ? styles.checklistDone : ''}`}>
                        <div className={`${styles.checkmark} ${checklist[item.key] ? styles.checkmarkDone : ''}`}>{checklist[item.key] ? '✓' : ''}</div>
                        <div className={styles.checklistItemText}>
                          <div className={styles.checklistItemTitle}>{item.title}</div>
                          <div className={styles.checklistItemSub}>{item.sub}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.firstBattleCard}>
                  <div className={styles.firstBattleIcon}>⚔️</div>
                  <div className={styles.firstBattleTitle}>Start your first battle</div>
                  <p className={styles.firstBattleBody}>You haven't debated yet. Pick a topic, get matched with someone who disagrees, and let the crowd decide who wins.</p>
                  <Link href="/battle" className={styles.firstBattleBtn}>Find me an opponent →</Link>
                </div>

                <div className={styles.suggestedCard}>
                  <div className={styles.suggestedTitle}>🔥 Suggested topics for you</div>
                  <p className={styles.suggestedSub}>Based on your interest in {favSports.join(' & ')}</p>
                  <div className={styles.topicsList}>
                    {suggestedTopics.map((topic, i) => (
                      <Link href="/battle" key={i} className={styles.topicRow}>
                        <div className={styles.topicText}>"{topic}"</div>
                        <div className={styles.topicDebateBtn}>Debate this →</div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className={styles.tabs}>
              {['history', 'topics', 'followers', 'following'].map(tab => (
                <button key={tab} className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`} onClick={() => setActiveTab(tab)}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {activeTab === 'history' && <div className={styles.emptyState}><div className={styles.emptyIcon}>⚔️</div><div className={styles.emptyTitle}>No battles yet</div><p className={styles.emptyBody}>Once you start debating your battle history will show up here.</p><Link href="/battle" className={styles.emptyBtn}>Start your first battle →</Link></div>}
            {activeTab === 'topics' && <div className={styles.emptyState}><div className={styles.emptyIcon}>🔥</div><div className={styles.emptyTitle}>No favorite topics yet</div><p className={styles.emptyBody}>Topics you debate most will appear here automatically.</p><Link href="/battle" className={styles.emptyBtn}>Start debating →</Link></div>}
            {activeTab === 'followers' && <div className={styles.emptyState}><div className={styles.emptyIcon}>👥</div><div className={styles.emptyTitle}>No followers yet</div><p className={styles.emptyBody}>Win some battles and people will start following you.</p><Link href="/battle" className={styles.emptyBtn}>Start building your rep →</Link></div>}
            {activeTab === 'following' && <div className={styles.emptyState}><div className={styles.emptyIcon}>👀</div><div className={styles.emptyTitle}>Not following anyone yet</div><p className={styles.emptyBody}>Follow other debaters to see their battles and takes.</p><Link href="/leaderboard" className={styles.emptyBtn}>Find debaters to follow →</Link></div>}

          </div>
        </div>
      </div>
    </main>
  );
}
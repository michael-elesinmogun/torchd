'use client';
import React, { useState, useRef } from 'react';
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
 
const PROFILE = {
  name: 'Jordan Kim',
  handle: 'jordankim',
  location: 'Boston, MA',
  bio: 'LeBron is the GOAT and I will debate anyone, anywhere, anytime. Come find me.',
  favoriteSports: ['NBA', 'NFL'],
  favoriteTeams: ['Celtics', 'Patriots'],
  stats: { battles: 0, winRate: 0, rank: null, streak: 0 },
  followers: 0,
  following: 0,
  isNewUser: true,
};
 
export default function Profile({ params }) {
  const { username } = React.use(params);
  const fileInputRef = useRef(null);
 
  const [activeTab, setActiveTab] = useState('history');
  const [following, setFollowing] = useState(false);
  const [followCount, setFollowCount] = useState(PROFILE.followers);
  const [editingSports, setEditingSports] = useState(false);
  const [favSports, setFavSports] = useState(PROFILE.favoriteSports);
  const [favTeams, setFavTeams] = useState(PROFILE.favoriteTeams);
  const [bio, setBio] = useState(PROFILE.bio);
  const [editingBio, setEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState(PROFILE.bio);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [checklist, setChecklist] = useState({
    addBio: true,
    pickTeams: PROFILE.favoriteTeams.length > 0,
    firstBattle: false,
  });
 
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
    setChecklist(prev => ({ ...prev, addBio: true }));
  }
 
  function shareProfile() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
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
 
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { upsert: true });
 
    if (error) {
      console.error('Upload error:', error.message);
      setUploading(false);
      return;
    }
 
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);
 
    setPhotoUrl(urlData.publicUrl);
    setUploading(false);
  }
 
  const completedCount = Object.values(checklist).filter(Boolean).length;
  const totalCount = Object.keys(checklist).length;
  const progressPct = Math.round((completedCount / totalCount) * 100);
  const suggestedTopics = favSports.length > 0 ? SUGGESTED_TOPICS[favSports[0]] || [] : SUGGESTED_TOPICS['NBA'];
 
  // Format display name from username
  const displayName = username
    .split(/[-_]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
 
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
 
      <div className={styles.page}>
        <div className={styles.layout}>
 
          {/* LEFT SIDEBAR */}
          <div className={styles.sidebar}>
 
            {/* Profile card */}
            <div className={styles.profileCard}>
 
              {/* Avatar with upload */}
              <div className={styles.avatarWrap}>
                <div className={styles.avatarContainer} onClick={() => fileInputRef.current?.click()}>
                  {photoUrl
                    ? <img src={photoUrl} alt="Profile" className={styles.avatarImg} />
                    : <div className={styles.avatar}>{PROFILE.name.split(' ').map(n => n[0]).join('')}</div>
                  }
                  <div className={styles.avatarOverlay}>
                    {uploading ? '⏳' : '📷'}
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handlePhotoUpload}
                />
                <div className={styles.avatarHint}>Click to upload photo</div>
              </div>
 
              {/* Name — derived from URL */}
              <div className={styles.profileName}>{displayName}</div>
              <div className={styles.profileHandle}>@{username}</div>
              <div className={styles.profileLocation}>📍 {PROFILE.location}</div>
 
              {/* Bio — editable */}
              {editingBio ? (
                <div className={styles.bioEditWrap}>
                  <textarea
                    className={styles.bioTextarea}
                    value={bioInput}
                    onChange={e => setBioInput(e.target.value)}
                    maxLength={160}
                    rows={3}
                    placeholder="Your take in one line..."
                    autoFocus
                  />
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
 
              {/* Followers */}
              <div className={styles.followRow}>
                <div className={styles.followStat}>
                  <span className={styles.followNum}>{followCount}</span>
                  <span className={styles.followLabel}>Followers</span>
                </div>
                <div className={styles.followDivider}></div>
                <div className={styles.followStat}>
                  <span className={styles.followNum}>{PROFILE.following}</span>
                  <span className={styles.followLabel}>Following</span>
                </div>
              </div>
 
              <button className={`${styles.followBtn} ${following ? styles.followingBtn : ''}`} onClick={toggleFollow}>
                {following ? '✓ Following' : '+ Follow'}
              </button>
 
              <Link href="/battle" className={styles.challengeBtn}>⚔️ Challenge to a Battle</Link>
 
              {/* Share profile button */}
              <button className={styles.shareBtn} onClick={shareProfile}>
                {copied ? '✓ Link copied!' : '🔗 Share profile'}
              </button>
 
            </div>
 
            {/* Favorite sports & teams */}
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
 
            {/* Stats */}
            <div className={styles.sideCard}>
              <div className={styles.sideCardTitle}>Stats</div>
              <div className={styles.statsGrid}>
                <div className={styles.statItem}><div className={styles.statNum} style={{color: PROFILE.stats.battles === 0 ? '#3D4A66' : '#3B82F6'}}>{PROFILE.stats.battles}</div><div className={styles.statLabel}>Battles</div></div>
                <div className={styles.statItem}><div className={styles.statNum} style={{color: PROFILE.stats.winRate === 0 ? '#3D4A66' : '#10B981'}}>{PROFILE.stats.winRate === 0 ? '—' : `${PROFILE.stats.winRate}%`}</div><div className={styles.statLabel}>Win Rate</div></div>
                <div className={styles.statItem}><div className={styles.statNum} style={{color: !PROFILE.stats.rank ? '#3D4A66' : '#F59E0B'}}>{PROFILE.stats.rank ? `#${PROFILE.stats.rank}` : '—'}</div><div className={styles.statLabel}>Rank</div></div>
                <div className={styles.statItem}><div className={styles.statNum} style={{color: PROFILE.stats.streak === 0 ? '#3D4A66' : '#EF4444'}}>{PROFILE.stats.streak === 0 ? '—' : `${PROFILE.stats.streak}🔥`}</div><div className={styles.statLabel}>Streak</div></div>
              </div>
            </div>
 
          </div>
 
          {/* MAIN CONTENT */}
          <div className={styles.mainContent}>
 
            {/* New user onboarding */}
            {PROFILE.isNewUser && (
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
                    <div className={`${styles.checklistItem} ${checklist.addBio ? styles.checklistDone : ''}`}>
                      <div className={`${styles.checkmark} ${checklist.addBio ? styles.checkmarkDone : ''}`}>{checklist.addBio ? '✓' : ''}</div>
                      <div className={styles.checklistItemText}>
                        <div className={styles.checklistItemTitle}>Add a bio</div>
                        <div className={styles.checklistItemSub}>Tell the world your take</div>
                      </div>
                    </div>
                    <div className={`${styles.checklistItem} ${checklist.pickTeams ? styles.checklistDone : ''}`}>
                      <div className={`${styles.checkmark} ${checklist.pickTeams ? styles.checkmarkDone : ''}`}>{checklist.pickTeams ? '✓' : ''}</div>
                      <div className={styles.checklistItemText}>
                        <div className={styles.checklistItemTitle}>Pick your favorite teams</div>
                        <div className={styles.checklistItemSub}>So we can match you with the right opponents</div>
                      </div>
                    </div>
                    <div className={`${styles.checklistItem} ${checklist.firstBattle ? styles.checklistDone : ''}`}>
                      <div className={`${styles.checkmark} ${checklist.firstBattle ? styles.checkmarkDone : ''}`}>{checklist.firstBattle ? '✓' : ''}</div>
                      <div className={styles.checklistItemText}>
                        <div className={styles.checklistItemTitle}>Start your first battle</div>
                        <div className={styles.checklistItemSub}>Prove your takes are built different</div>
                      </div>
                    </div>
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
 
            {/* Tabs */}
            <div className={styles.tabs}>
              <button className={`${styles.tab} ${activeTab === 'history' ? styles.tabActive : ''}`} onClick={() => setActiveTab('history')}>Battle History</button>
              <button className={`${styles.tab} ${activeTab === 'topics' ? styles.tabActive : ''}`} onClick={() => setActiveTab('topics')}>Favorite Topics</button>
              <button className={`${styles.tab} ${activeTab === 'followers' ? styles.tabActive : ''}`} onClick={() => setActiveTab('followers')}>Followers</button>
              <button className={`${styles.tab} ${activeTab === 'following' ? styles.tabActive : ''}`} onClick={() => setActiveTab('following')}>Following</button>
            </div>
 
            {activeTab === 'history' && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>⚔️</div>
                <div className={styles.emptyTitle}>No battles yet</div>
                <p className={styles.emptyBody}>Once you start debating your battle history will show up here.</p>
                <Link href="/battle" className={styles.emptyBtn}>Start your first battle →</Link>
              </div>
            )}
 
            {activeTab === 'topics' && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🔥</div>
                <div className={styles.emptyTitle}>No favorite topics yet</div>
                <p className={styles.emptyBody}>Topics you debate most will appear here automatically.</p>
                <Link href="/battle" className={styles.emptyBtn}>Start debating →</Link>
              </div>
            )}
 
            {activeTab === 'followers' && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>👥</div>
                <div className={styles.emptyTitle}>No followers yet</div>
                <p className={styles.emptyBody}>Win some battles and people will start following you.</p>
                <Link href="/battle" className={styles.emptyBtn}>Start building your rep →</Link>
              </div>
            )}
 
            {activeTab === 'following' && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>👀</div>
                <div className={styles.emptyTitle}>Not following anyone yet</div>
                <p className={styles.emptyBody}>Follow other debaters to see their battles and takes.</p>
                <Link href="/leaderboard" className={styles.emptyBtn}>Find debaters to follow →</Link>
              </div>
            )}
 
          </div>
        </div>
      </div>
 
    </main>
  );
}
 
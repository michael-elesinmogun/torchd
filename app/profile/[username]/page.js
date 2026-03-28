'use client';
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [initials, setInitials] = useState('?');
  const [loading, setLoading] = useState(true);

  const [editingHandle, setEditingHandle] = useState(false);
  const [handleInput, setHandleInput] = useState(username);
  const [handleError, setHandleError] = useState('');
  const [savingHandle, setSavingHandle] = useState(false);

  const [bio, setBio] = useState('');
  const [editingBio, setEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState('');
  const [savingBio, setSavingBio] = useState(false);

  const [favSports, setFavSports] = useState([]);
  const [favTeams, setFavTeams] = useState([]);
  const [editingSports, setEditingSports] = useState(false);
  const [savingSports, setSavingSports] = useState(false);

  const [activeTab, setActiveTab] = useState('history');
  const [following, setFollowing] = useState(false);
  const [followCount, setFollowCount] = useState(0);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [checklist, setChecklist] = useState({
    addBio: false,
    pickTeams: false,
    firstBattle: false,
  });

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      // Get logged in user
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user;
      setUser(currentUser);

      // Fetch the profile being viewed by username
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (profileData) {
        setProfile(profileData);
        setBio(profileData.bio || '');
        setBioInput(profileData.bio || '');
        if (profileData.avatar_url) setPhotoUrl(profileData.avatar_url);

        // Display name always comes from profile data
        const fullName = profileData.full_name || '';
        setDisplayName(fullName || username);
        setInitials(
          fullName
            ? fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
            : username.slice(0, 2).toUpperCase()
        );

        // Set sport
        const sportMap = { nba: 'NBA', nfl: 'NFL', soccer: 'Soccer', mlb: 'MLB', nhl: 'NHL', all: 'NBA' };
        const mappedSport = sportMap[profileData.sport?.toLowerCase()];
        if (mappedSport) setFavSports([mappedSport]);

        setChecklist({
          addBio: !!profileData.bio,
          pickTeams: !!profileData.sport,
          firstBattle: false,
        });
      } else {
        // No profile found — derive name from URL
        setDisplayName(
          username.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        );
        setInitials(username.slice(0, 2).toUpperCase());
      }

      setLoading(false);
    }
    fetchData();
  }, [username]);

  const isOwner = user && profile && user.id === profile.id;

  async function saveBio() {
    setSavingBio(true);
    const { error } = await supabase.from('profiles').update({ bio: bioInput }).eq('username', username);
    setSavingBio(false);
    if (!error) {
      setBio(bioInput);
      setEditingBio(false);
      setChecklist(prev => ({ ...prev, addBio: !!bioInput }));
    }
  }

  async function saveSports() {
    setSavingSports(true);
    const sportValue = favSports[0]?.toLowerCase() || '';
    const { error } = await supabase.from('profiles').update({ sport: sportValue }).eq('username', username);
    setSavingSports(false);
    if (!error) {
      setEditingSports(false);
      setChecklist(prev => ({ ...prev, pickTeams: favSports.length > 0 }));
    }
  }

  async function saveHandle() {
    if (handleInput.length < 3) { setHandleError('Min 3 characters'); return; }
    if (!/^[a-z0-9_]+$/.test(handleInput)) { setHandleError('Only letters, numbers and underscores'); return; }
    setSavingHandle(true);
    setHandleError('');
    const { data: existing } = await supabase.from('profiles').select('username').eq('username', handleInput).single();
    if (existing) { setHandleError('That username is already taken'); setSavingHandle(false); return; }
    const { error } = await supabase.from('profiles').update({ username: handleInput }).eq('id', user.id);
    setSavingHandle(false);
    if (!error) { setEditingHandle(false); router.push(`/profile/${handleInput}`); }
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${username}-${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
    if (error) { setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
    const avatarUrl = urlData.publicUrl;
    setPhotoUrl(avatarUrl);
    await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('username', username);
    setUploading(false);
  }

  function toggleFollow() { setFollowing(!following); setFollowCount(f => following ? f - 1 : f + 1); }
  function toggleSport(sport) { setFavSports(prev => prev.includes(sport) ? prev.filter(s => s !== sport) : [...prev, sport]); }
  function toggleTeam(team) { setFavTeams(prev => prev.includes(team) ? prev.filter(t => t !== team) : [...prev, team]); }
  function shareProfile() { navigator.clipboard.writeText(window.location.href).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }

  const completedCount = Object.values(checklist).filter(Boolean).length;
  const totalCount = Object.keys(checklist).length;
  const progressPct = Math.round((completedCount / totalCount) * 100);
  const suggestedTopics = favSports.length > 0 ? SUGGESTED_TOPICS[favSports[0]] || [] : SUGGESTED_TOPICS['NBA'];

  if (loading) {
    return (
      <main className={styles.main}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'80vh'}}>
          <div style={{fontFamily:'Syne,sans-serif',fontSize:'18px',color:'#6B7A9E'}}>Loading profile...</div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.page}>
        <div className={styles.layout}>

          <div className={styles.sidebar}>
            <div className={styles.profileCard}>

              <div className={styles.avatarWrap}>
                <div className={styles.avatarContainer} onClick={() => isOwner && fileInputRef.current?.click()}>
                  {photoUrl
                    ? <img src={photoUrl} alt="Profile" className={styles.avatarImg} />
                    : <div className={styles.avatar}>{initials}</div>
                  }
                  {isOwner && <div className={styles.avatarOverlay}>{uploading ? '⏳' : '📷'}</div>}
                </div>
                {isOwner && <input ref={fileInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={handlePhotoUpload} />}
                {isOwner && <div className={styles.avatarHint}>Click to upload photo</div>}
              </div>

              <div className={styles.profileName}>{displayName}</div>

              {editingHandle ? (
                <div className={styles.handleEditWrap}>
                  <span className={styles.handleAt}>@</span>
                  <input className={styles.handleInput} value={handleInput} onChange={e => setHandleInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} maxLength={20} autoFocus onKeyDown={e => e.key === 'Enter' && saveHandle()} />
                  <button className={styles.handleSaveBtn} onClick={saveHandle} disabled={savingHandle}>{savingHandle ? '...' : 'Save'}</button>
                  <button className={styles.handleCancelBtn} onClick={() => { setEditingHandle(false); setHandleInput(username); setHandleError(''); }}>✕</button>
                </div>
              ) : (
                <div className={styles.profileHandleRow}>
                  <span className={styles.profileHandle}>@{username}</span>
                  {isOwner && <button className={styles.editHandleBtn} onClick={() => setEditingHandle(true)}>Edit</button>}
                </div>
              )}
              {handleError && <div className={styles.handleError}>{handleError}</div>}

              <div className={styles.profileLocation}>📍 Boston, MA</div>

              {editingBio ? (
                <div className={styles.bioEditWrap}>
                  <textarea className={styles.bioTextarea} value={bioInput} onChange={e => setBioInput(e.target.value)} maxLength={160} rows={3} placeholder="Your take in one line..." autoFocus />
                  <div className={styles.bioEditActions}>
                    <span className={styles.bioCharCount}>{bioInput.length}/160</span>
                    <button className={styles.bioSaveBtn} onClick={saveBio} disabled={savingBio}>{savingBio ? 'Saving...' : 'Save'}</button>
                    <button className={styles.bioCancelBtn} onClick={() => { setEditingBio(false); setBioInput(bio); }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className={styles.bioWrap}>
                  <p className={styles.profileBio}>{bio || (isOwner ? 'Add your take...' : 'No bio yet.')}</p>
                  {isOwner && <button className={styles.editBioBtn} onClick={() => setEditingBio(true)}>Edit bio</button>}
                </div>
              )}

              <div className={styles.followRow}>
                <div className={styles.followStat}><span className={styles.followNum}>{followCount}</span><span className={styles.followLabel}>Followers</span></div>
                <div className={styles.followDivider}></div>
                <div className={styles.followStat}><span className={styles.followNum}>0</span><span className={styles.followLabel}>Following</span></div>
              </div>

              {!isOwner && (
                <button className={`${styles.followBtn} ${following ? styles.followingBtn : ''}`} onClick={toggleFollow}>
                  {following ? '✓ Following' : '+ Follow'}
                </button>
              )}
              <Link href="/battle" className={styles.challengeBtn}>⚔️ {isOwner ? 'Start a Battle' : 'Challenge to a Battle'}</Link>
              <button className={styles.shareBtn} onClick={shareProfile}>{copied ? '✓ Link copied!' : '🔗 Share profile'}</button>
            </div>

            <div className={styles.sideCard}>
              <div className={styles.sideCardHeader}>
                <div className={styles.sideCardTitle}>Favorite Sports & Teams</div>
                {isOwner && (
                  <button className={styles.editBtn} onClick={() => editingSports ? saveSports() : setEditingSports(true)}>
                    {editingSports ? (savingSports ? 'Saving...' : 'Save') : 'Edit'}
                  </button>
                )}
              </div>
              {editingSports ? (
                <div className={styles.editSection}>
                  <div className={styles.editLabel}>Sports</div>
                  <div className={styles.sportsEditGrid}>
                    {SPORTS.map(sport => <button key={sport} className={`${styles.sportEditBtn} ${favSports.includes(sport) ? styles.sportEditSelected : ''}`} onClick={() => toggleSport(sport)}>{sport}</button>)}
                  </div>
                  {favSports.map(sport => (
                    <div key={sport}>
                      <div className={styles.editLabel}>{sport} Teams</div>
                      <div className={styles.teamsEditGrid}>
                        {TEAMS[sport]?.map(team => <button key={team} className={`${styles.teamEditBtn} ${favTeams.includes(team) ? styles.teamEditSelected : ''}`} onClick={() => toggleTeam(team)}>{team}</button>)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <div className={styles.sportBadges}>
                    {favSports.length > 0
                      ? favSports.map(sport => <div key={sport} className={styles.sportBadge}>{sport}</div>)
                      : <div style={{fontSize:'13px',color:'#3D4A66'}}>No sports selected yet</div>
                    }
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

          <div className={styles.mainContent}>
            {isOwner && (
              <div className={styles.onboardingSection}>
                <div className={styles.checklistCard}>
                  <div className={styles.checklistHeader}>
                    <div><div className={styles.checklistTitle}>Complete your profile</div><div className={styles.checklistSub}>{completedCount} of {totalCount} done</div></div>
                    <div className={styles.checklistPct}>{progressPct}%</div>
                  </div>
                  <div className={styles.progressTrack}><div className={styles.progressFill} style={{width:`${progressPct}%`}}></div></div>
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
                  <p className={styles.suggestedSub}>Based on your interest in {favSports.join(' & ') || 'sports'}</p>
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
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../supabase';
import styles from './settings.module.css';

export default function Settings() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profileSlug, setProfileSlug] = useState('');
  const [activeSection, setActiveSection] = useState('account');
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('dark');

  // Account fields
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Privacy
  const [isPublic, setIsPublic] = useState(true);
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(true);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [privacySuccess, setPrivacySuccess] = useState('');

  // Notifications
  const [notifBattleRequests, setNotifBattleRequests] = useState(true);
  const [notifNewFollowers, setNotifNewFollowers] = useState(true);
  const [notifBattleResults, setNotifBattleResults] = useState(true);
  const [notifWeeklyDigest, setNotifWeeklyDigest] = useState(false);
  const [savingNotifs, setSavingNotifs] = useState(false);
  const [notifsSuccess, setNotifsSuccess] = useState('');

  // Status messages
  const [nameSuccess, setNameSuccess] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('torchd-theme') || 'dark';
    setTheme(saved);
  }, []);

  function toggleTheme(newTheme) {
    setTheme(newTheme);
    localStorage.setItem('torchd-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  }

  useEffect(() => {
    async function fetchUser() {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user;
      if (!currentUser) { router.push('/login'); return; }
      setUser(currentUser);
      setEmail(currentUser.email || '');
      setNewEmail(currentUser.email || '');
      setDisplayName(currentUser.user_metadata?.full_name || '');

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, is_public, show_on_leaderboard, notif_battle_requests, notif_new_followers, notif_battle_results, notif_weekly_digest')
        .eq('id', currentUser.id)
        .single();

      if (profile) {
        setProfileSlug(profile.username || '');
        setIsPublic(profile.is_public ?? true);
        setShowOnLeaderboard(profile.show_on_leaderboard ?? true);
        setNotifBattleRequests(profile.notif_battle_requests ?? true);
        setNotifNewFollowers(profile.notif_new_followers ?? true);
        setNotifBattleResults(profile.notif_battle_results ?? true);
        setNotifWeeklyDigest(profile.notif_weekly_digest ?? false);
      }

      setLoading(false);
    }
    fetchUser();
  }, []);

  async function saveDisplayName() {
    setSavingName(true);
    setNameError(''); setNameSuccess('');
    const { error } = await supabase.auth.updateUser({ data: { full_name: displayName } });
    if (!error) await supabase.from('profiles').update({ full_name: displayName }).eq('id', user.id);
    setSavingName(false);
    if (error) setNameError(error.message);
    else setNameSuccess('Display name updated!');
  }

  async function saveEmail() {
    setSavingEmail(true);
    setEmailError(''); setEmailSuccess('');
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setSavingEmail(false);
    if (error) setEmailError(error.message);
    else setEmailSuccess('Confirmation email sent to your new address. Check your inbox!');
  }

  async function savePassword() {
    setSavingPassword(true);
    setPasswordError(''); setPasswordSuccess('');
    if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match'); setSavingPassword(false); return; }
    if (newPassword.length < 8) { setPasswordError('Password must be at least 8 characters'); setSavingPassword(false); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) setPasswordError(error.message);
    else { setPasswordSuccess('Password updated successfully!'); setNewPassword(''); setConfirmPassword(''); }
  }

  async function savePrivacy() {
    setSavingPrivacy(true); setPrivacySuccess('');
    const { error } = await supabase.from('profiles').update({ is_public: isPublic, show_on_leaderboard: showOnLeaderboard }).eq('id', user.id);
    setSavingPrivacy(false);
    if (!error) setPrivacySuccess('Privacy settings saved!');
  }

  async function saveNotifications() {
    setSavingNotifs(true); setNotifsSuccess('');
    const { error } = await supabase.from('profiles').update({
      notif_battle_requests: notifBattleRequests,
      notif_new_followers: notifNewFollowers,
      notif_battle_results: notifBattleResults,
      notif_weekly_digest: notifWeeklyDigest,
    }).eq('id', user.id);
    setSavingNotifs(false);
    if (!error) setNotifsSuccess('Notification preferences saved!');
  }

  async function deleteAccount() {
    if (deleteInput !== 'DELETE') return;
    await supabase.auth.signOut();
    router.push('/');
  }

  const sections = [
    { id: 'account', label: '👤 Account' },
    { id: 'password', label: '🔒 Password' },
    { id: 'appearance', label: '🎨 Appearance' },
    { id: 'privacy', label: '🔐 Privacy' },
    { id: 'notifications', label: '🔔 Notifications' },
    { id: 'danger', label: '⚠️ Danger Zone' },
  ];

  if (loading) {
    return <main className={styles.main}><div className={styles.loadingWrap}>Loading settings...</div></main>;
  }

  return (
    <main className={styles.main}>
      <div className={styles.page}>

        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Settings</h1>
            <p className={styles.pageSub}>Manage your account and preferences</p>
          </div>
          {profileSlug && <Link href={`/profile/${profileSlug}`} className={styles.backBtn}>← Back to profile</Link>}
        </div>

        <div className={styles.layout}>
          <div className={styles.sidebar}>
            {sections.map(s => (
              <button key={s.id}
                className={`${styles.sidebarBtn} ${activeSection === s.id ? styles.sidebarBtnActive : ''} ${s.id === 'danger' ? styles.sidebarBtnDanger : ''}`}
                onClick={() => setActiveSection(s.id)}
              >{s.label}</button>
            ))}
          </div>

          <div className={styles.content}>

            {activeSection === 'account' && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Account Information</div>
                <div className={styles.sectionSub}>Update your display name and email address</div>
                <div className={styles.formBlock}>
                  <div className={styles.formBlockTitle}>Display Name</div>
                  <div className={styles.formRow}>
                    <input className={styles.input} type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your full name" />
                    <button className={styles.saveBtn} onClick={saveDisplayName} disabled={savingName}>{savingName ? 'Saving...' : 'Save'}</button>
                  </div>
                  {nameSuccess && <div className={styles.successMsg}>{nameSuccess}</div>}
                  {nameError && <div className={styles.errorMsg}>{nameError}</div>}
                </div>
                <div className={styles.divider}></div>
                <div className={styles.formBlock}>
                  <div className={styles.formBlockTitle}>Email Address</div>
                  <div className={styles.formBlockSub}>We'll send a confirmation to your new email before changing it</div>
                  <div className={styles.formRow}>
                    <input className={styles.input} type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                    <button className={styles.saveBtn} onClick={saveEmail} disabled={savingEmail || newEmail === email}>{savingEmail ? 'Sending...' : 'Update'}</button>
                  </div>
                  {emailSuccess && <div className={styles.successMsg}>{emailSuccess}</div>}
                  {emailError && <div className={styles.errorMsg}>{emailError}</div>}
                </div>
              </div>
            )}

            {activeSection === 'password' && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Change Password</div>
                <div className={styles.sectionSub}>Choose a strong password at least 8 characters long</div>
                <div className={styles.formBlock}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>New password</label>
                    <input className={styles.input} type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="At least 8 characters" />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Confirm new password</label>
                    <input className={styles.input} type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat your new password" />
                  </div>
                  {passwordSuccess && <div className={styles.successMsg}>{passwordSuccess}</div>}
                  {passwordError && <div className={styles.errorMsg}>{passwordError}</div>}
                  <button className={styles.saveBtnFull} onClick={savePassword} disabled={savingPassword || !newPassword || !confirmPassword}>
                    {savingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </div>
            )}

            {activeSection === 'appearance' && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Appearance</div>
                <div className={styles.sectionSub}>Choose how Torchd looks for you</div>
                <div className={styles.formBlock}>
                  <div className={styles.themeGrid}>
                    <button
                      onClick={() => toggleTheme('dark')}
                      className={`${styles.themeOption} ${theme === 'dark' ? styles.themeOptionActive : ''}`}
                    >
                      <div className={styles.themePreview} style={{ background: '#060912', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', marginBottom: '6px' }} />
                        <div style={{ width: '70%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginBottom: '4px' }} />
                        <div style={{ width: '85%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} />
                      </div>
                      <div className={styles.themeLabel}>
                        <span>🌙 Dark</span>
                        {theme === 'dark' && <span className={styles.themeCheck}>✓</span>}
                      </div>
                    </button>

                    <button
                      onClick={() => toggleTheme('light')}
                      className={`${styles.themeOption} ${theme === 'light' ? styles.themeOptionActive : ''}`}
                    >
                      <div className={styles.themePreview} style={{ background: '#F4F6FB', border: '1px solid rgba(0,0,0,0.08)' }}>
                        <div style={{ width: '100%', height: '12px', background: 'rgba(0,0,0,0.08)', borderRadius: '4px', marginBottom: '6px' }} />
                        <div style={{ width: '70%', height: '8px', background: 'rgba(0,0,0,0.05)', borderRadius: '4px', marginBottom: '4px' }} />
                        <div style={{ width: '85%', height: '8px', background: 'rgba(0,0,0,0.05)', borderRadius: '4px' }} />
                      </div>
                      <div className={styles.themeLabel}>
                        <span>☀️ Light</span>
                        {theme === 'light' && <span className={styles.themeCheck}>✓</span>}
                      </div>
                    </button>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                    Your preference is saved automatically and synced across all pages.
                  </p>
                </div>
              </div>
            )}

            {activeSection === 'privacy' && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Privacy Settings</div>
                <div className={styles.sectionSub}>Control who can see your profile and activity</div>
                <div className={styles.formBlock}>
                  <div className={styles.toggleRow}>
                    <div className={styles.toggleInfo}>
                      <div className={styles.toggleTitle}>Public profile</div>
                      <div className={styles.toggleSub}>Anyone can view your profile, debates and stats</div>
                    </div>
                    <button className={`${styles.toggle} ${isPublic ? styles.toggleOn : styles.toggleOff}`} onClick={() => setIsPublic(!isPublic)}>
                      <div className={styles.toggleThumb}></div>
                    </button>
                  </div>
                  <div className={styles.divider}></div>
                  <div className={styles.toggleRow}>
                    <div className={styles.toggleInfo}>
                      <div className={styles.toggleTitle}>Show on leaderboard</div>
                      <div className={styles.toggleSub}>Your rank and stats appear on the global leaderboard</div>
                    </div>
                    <button className={`${styles.toggle} ${showOnLeaderboard ? styles.toggleOn : styles.toggleOff}`} onClick={() => setShowOnLeaderboard(!showOnLeaderboard)}>
                      <div className={styles.toggleThumb}></div>
                    </button>
                  </div>
                  {privacySuccess && <div className={styles.successMsg} style={{marginTop:'1rem'}}>{privacySuccess}</div>}
                  <button className={styles.saveBtnFull} onClick={savePrivacy} disabled={savingPrivacy} style={{marginTop:'1.5rem'}}>
                    {savingPrivacy ? 'Saving...' : 'Save Privacy Settings'}
                  </button>
                </div>
              </div>
            )}

            {activeSection === 'notifications' && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Notification Preferences</div>
                <div className={styles.sectionSub}>Choose what you want to be notified about</div>
                <div className={styles.formBlock}>
                  {[
                    { state: notifBattleRequests, setter: setNotifBattleRequests, title: 'Battle requests', sub: 'When someone challenges you to a debate' },
                    { state: notifNewFollowers, setter: setNotifNewFollowers, title: 'New followers', sub: 'When someone follows your profile' },
                    { state: notifBattleResults, setter: setNotifBattleResults, title: 'Battle results', sub: 'When voting closes on your debates' },
                    { state: notifWeeklyDigest, setter: setNotifWeeklyDigest, title: 'Weekly digest', sub: 'A summary of your stats and top debates every week' },
                  ].map((item, i) => (
                    <div key={i}>
                      {i > 0 && <div className={styles.divider}></div>}
                      <div className={styles.toggleRow}>
                        <div className={styles.toggleInfo}>
                          <div className={styles.toggleTitle}>{item.title}</div>
                          <div className={styles.toggleSub}>{item.sub}</div>
                        </div>
                        <button className={`${styles.toggle} ${item.state ? styles.toggleOn : styles.toggleOff}`} onClick={() => item.setter(!item.state)}>
                          <div className={styles.toggleThumb}></div>
                        </button>
                      </div>
                    </div>
                  ))}
                  {notifsSuccess && <div className={styles.successMsg} style={{marginTop:'1rem'}}>{notifsSuccess}</div>}
                  <button className={styles.saveBtnFull} onClick={saveNotifications} disabled={savingNotifs} style={{marginTop:'1.5rem'}}>
                    {savingNotifs ? 'Saving...' : 'Save Notification Preferences'}
                  </button>
                </div>
              </div>
            )}

            {activeSection === 'danger' && (
              <div className={styles.section}>
                <div className={styles.sectionTitle} style={{color:'#F87171'}}>Danger Zone</div>
                <div className={styles.sectionSub}>These actions are permanent and cannot be undone</div>
                <div className={`${styles.formBlock} ${styles.dangerBlock}`}>
                  <div className={styles.dangerTitle}>Delete Account</div>
                  <p className={styles.dangerBody}>Permanently delete your account and all associated data — your profile, battle history, followers and stats. This cannot be reversed.</p>
                  {!showDeleteConfirm ? (
                    <button className={styles.deleteBtn} onClick={() => setShowDeleteConfirm(true)}>Delete my account</button>
                  ) : (
                    <div className={styles.deleteConfirm}>
                      <p className={styles.deleteConfirmText}>Type <strong>DELETE</strong> to confirm:</p>
                      <input className={`${styles.input} ${styles.deleteInput}`} type="text" value={deleteInput} onChange={e => setDeleteInput(e.target.value)} placeholder="Type DELETE" />
                      <div className={styles.deleteActions}>
                        <button className={styles.deleteConfirmBtn} onClick={deleteAccount} disabled={deleteInput !== 'DELETE'}>Yes, delete my account</button>
                        <button className={styles.deleteCancelBtn} onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </main>
  );
}
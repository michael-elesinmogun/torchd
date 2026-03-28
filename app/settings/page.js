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

  // Account fields
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Privacy
  const [isPublic, setIsPublic] = useState(true);
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(true);

  // Notifications
  const [notifBattleRequests, setNotifBattleRequests] = useState(true);
  const [notifNewFollowers, setNotifNewFollowers] = useState(true);
  const [notifBattleResults, setNotifBattleResults] = useState(true);
  const [notifWeeklyDigest, setNotifWeeklyDigest] = useState(false);

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
        .select('username')
        .eq('id', currentUser.id)
        .single();

      if (profile?.username) setProfileSlug(profile.username);
      setLoading(false);
    }
    fetchUser();
  }, []);

  async function saveDisplayName() {
    setSavingName(true);
    setNameError('');
    setNameSuccess('');

    const { error } = await supabase.auth.updateUser({
      data: { full_name: displayName }
    });

    // Also update in profiles table
    if (!error) {
      await supabase
        .from('profiles')
        .update({ full_name: displayName })
        .eq('id', user.id);
    }

    setSavingName(false);
    if (error) { setNameError(error.message); }
    else { setNameSuccess('Display name updated successfully!'); }
  }

  async function saveEmail() {
    setSavingEmail(true);
    setEmailError('');
    setEmailSuccess('');

    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setSavingEmail(false);
    if (error) { setEmailError(error.message); }
    else { setEmailSuccess('Confirmation email sent to your new address. Check your inbox!'); }
  }

  async function savePassword() {
    setSavingPassword(true);
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      setSavingPassword(false);
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      setSavingPassword(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) { setPasswordError(error.message); }
    else {
      setPasswordSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  }

  async function deleteAccount() {
    if (deleteInput !== 'DELETE') return;
    // Sign out and redirect — full deletion requires server-side in production
    await supabase.auth.signOut();
    router.push('/');
  }

  const sections = [
    { id: 'account', label: '👤 Account', icon: '👤' },
    { id: 'password', label: '🔒 Password', icon: '🔒' },
    { id: 'privacy', label: '🔐 Privacy', icon: '🔐' },
    { id: 'notifications', label: '🔔 Notifications', icon: '🔔' },
    { id: 'danger', label: '⚠️ Danger Zone', icon: '⚠️' },
  ];

  if (loading) {
    return (
      <main className={styles.main}>
        <div className={styles.loadingWrap}>Loading settings...</div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.page}>

        {/* Header */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Settings</h1>
            <p className={styles.pageSub}>Manage your account and preferences</p>
          </div>
          {profileSlug && (
            <Link href={`/profile/${profileSlug}`} className={styles.backBtn}>
              ← Back to profile
            </Link>
          )}
        </div>

        <div className={styles.layout}>

          {/* Sidebar nav */}
          <div className={styles.sidebar}>
            {sections.map(s => (
              <button
                key={s.id}
                className={`${styles.sidebarBtn} ${activeSection === s.id ? styles.sidebarBtnActive : ''} ${s.id === 'danger' ? styles.sidebarBtnDanger : ''}`}
                onClick={() => setActiveSection(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Main content */}
          <div className={styles.content}>

            {/* Account section */}
            {activeSection === 'account' && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Account Information</div>
                <div className={styles.sectionSub}>Update your display name and email address</div>

                <div className={styles.formBlock}>
                  <div className={styles.formBlockTitle}>Display Name</div>
                  <div className={styles.formRow}>
                    <input
                      className={styles.input}
                      type="text"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      placeholder="Your full name"
                    />
                    <button className={styles.saveBtn} onClick={saveDisplayName} disabled={savingName}>
                      {savingName ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                  {nameSuccess && <div className={styles.successMsg}>{nameSuccess}</div>}
                  {nameError && <div className={styles.errorMsg}>{nameError}</div>}
                </div>

                <div className={styles.divider}></div>

                <div className={styles.formBlock}>
                  <div className={styles.formBlockTitle}>Email Address</div>
                  <div className={styles.formBlockSub}>We'll send a confirmation to your new email before changing it</div>
                  <div className={styles.formRow}>
                    <input
                      className={styles.input}
                      type="email"
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                    />
                    <button className={styles.saveBtn} onClick={saveEmail} disabled={savingEmail || newEmail === email}>
                      {savingEmail ? 'Sending...' : 'Update'}
                    </button>
                  </div>
                  {emailSuccess && <div className={styles.successMsg}>{emailSuccess}</div>}
                  {emailError && <div className={styles.errorMsg}>{emailError}</div>}
                </div>
              </div>
            )}

            {/* Password section */}
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

            {/* Privacy section */}
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
                    <button
                      className={`${styles.toggle} ${isPublic ? styles.toggleOn : styles.toggleOff}`}
                      onClick={() => setIsPublic(!isPublic)}
                    >
                      <div className={styles.toggleThumb}></div>
                    </button>
                  </div>

                  <div className={styles.divider}></div>

                  <div className={styles.toggleRow}>
                    <div className={styles.toggleInfo}>
                      <div className={styles.toggleTitle}>Show on leaderboard</div>
                      <div className={styles.toggleSub}>Your rank and stats appear on the global leaderboard</div>
                    </div>
                    <button
                      className={`${styles.toggle} ${showOnLeaderboard ? styles.toggleOn : styles.toggleOff}`}
                      onClick={() => setShowOnLeaderboard(!showOnLeaderboard)}
                    >
                      <div className={styles.toggleThumb}></div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications section */}
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
                        <button
                          className={`${styles.toggle} ${item.state ? styles.toggleOn : styles.toggleOff}`}
                          onClick={() => item.setter(!item.state)}
                        >
                          <div className={styles.toggleThumb}></div>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Danger zone */}
            {activeSection === 'danger' && (
              <div className={styles.section}>
                <div className={styles.sectionTitle} style={{color:'#F87171'}}>Danger Zone</div>
                <div className={styles.sectionSub}>These actions are permanent and cannot be undone</div>

                <div className={`${styles.formBlock} ${styles.dangerBlock}`}>
                  <div className={styles.dangerTitle}>Delete Account</div>
                  <p className={styles.dangerBody}>
                    Permanently delete your account and all associated data — your profile, battle history, followers and stats. This cannot be reversed.
                  </p>

                  {!showDeleteConfirm ? (
                    <button className={styles.deleteBtn} onClick={() => setShowDeleteConfirm(true)}>
                      Delete my account
                    </button>
                  ) : (
                    <div className={styles.deleteConfirm}>
                      <p className={styles.deleteConfirmText}>Type <strong>DELETE</strong> to confirm:</p>
                      <input
                        className={`${styles.input} ${styles.deleteInput}`}
                        type="text"
                        value={deleteInput}
                        onChange={e => setDeleteInput(e.target.value)}
                        placeholder="Type DELETE"
                      />
                      <div className={styles.deleteActions}>
                        <button
                          className={styles.deleteConfirmBtn}
                          onClick={deleteAccount}
                          disabled={deleteInput !== 'DELETE'}
                        >
                          Yes, delete my account
                        </button>
                        <button className={styles.deleteCancelBtn} onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); }}>
                          Cancel
                        </button>
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
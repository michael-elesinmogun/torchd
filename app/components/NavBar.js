'use client';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '../supabase';

export default function NavBar() {
  const [user, setUser] = useState(null);
  const [profileSlug, setProfileSlug] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);
  const pathname = usePathname();

  useEffect(() => { setMenuOpen(false); setNotifOpen(false); }, [pathname]);

  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    let notifChannel = null;

    async function fetchUserAndProfile() {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user;
      setUser(currentUser);

      if (currentUser) {
        const { data: profile } = await supabase
          .from('profiles').select('username').eq('id', currentUser.id).single();

        if (profile?.username) {
          setProfileSlug(profile.username);
        } else {
          const fullName = currentUser.user_metadata?.full_name || '';
          setProfileSlug(fullName ? fullName.toLowerCase().replace(/\s+/g, '') : currentUser.email?.split('@')[0] || 'profile');
        }

        await loadNotifications(currentUser.id);

        notifChannel = supabase
          .channel(`notifications-${currentUser.id}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser.id}` }, (payload) => {
            setNotifications(prev => [payload.new, ...prev]);
            setUnreadCount(c => c + 1);
          })
          .subscribe();
      }

      setLoading(false);
    }

    fetchUserAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase.from('profiles').select('username').eq('id', session.user.id).single()
          .then(({ data: profile }) => { if (profile?.username) setProfileSlug(profile.username); });
        loadNotifications(session.user.id);
      } else {
        setProfileSlug(null);
        setNotifications([]);
        setUnreadCount(0);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (notifChannel) supabase.removeChannel(notifChannel);
    };
  }, []);

  async function loadNotifications(userId) {
    const { data } = await supabase
      .from('notifications').select('*').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(20);
    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    }
  }

  async function openNotifications() {
    const opening = !notifOpen;
    setNotifOpen(opening);
    if (opening && unreadCount > 0) {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      if (unreadIds.length > 0) {
        await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    }
  }

  async function markAllRead() {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  async function clearAllNotifications() {
    if (!user) return;
    await supabase.from('notifications').delete().eq('user_id', user.id);
    setNotifications([]);
    setUnreadCount(0);
  }

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  function notifIcon(type) {
    if (type === 'new_follower') return '👤';
    if (type === 'battle_request') return '⚔️';
    if (type === 'battle_accepted') return '⚔️';
    if (type === 'battle_result') return '🏆';
    return '🔔';
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  const fullName = user?.user_metadata?.full_name || '';
  const displayName = fullName || user?.email?.split('@')[0] || '';
  const truncatedName = displayName.length > 18 ? displayName.slice(0, 18) + '…' : displayName;
  const initials = fullName
    ? fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.[0] || '?').toUpperCase();

  const navLinks = [
    { href: '/battle', label: '⚔️ Battle Mode' },
    { href: '/lobby', label: '🏟️ Game Lobby' },
    { href: '/leaderboard', label: '🏆 Leaderboard' },
    { href: '/search', label: '🔍 Search' },
  ];

  const logoHref = user ? '/lobby' : '/';

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(1rem, 4vw, 3rem)', height: '62px',
        background: 'rgba(6,9,18,0.92)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.065)',
        fontFamily: 'DM Sans, sans-serif',
      }}>

        <Link href={logoHref} style={{
          fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 800,
          color: '#3B82F6', textDecoration: 'none', letterSpacing: '-0.5px',
          display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0,
        }}>
          🔥 Torchd
        </Link>

        <ul style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', listStyle: 'none', margin: 0, padding: 0 }} className="nav-desktop-links">
          {[{ href: '/battle', label: 'Battle Mode' }, { href: '/lobby', label: 'Game Lobby' }, { href: '/leaderboard', label: 'Leaderboard' }].map(link => (
            <li key={link.href}>
              <Link href={link.href} style={{ fontSize: '14px', color: '#6B7A9E', textDecoration: 'none', padding: '6px 12px', borderRadius: '8px', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.target.style.color = '#EEF2FF'; e.target.style.background = '#151e2e'; }}
                onMouseLeave={e => { e.target.style.color = '#6B7A9E'; e.target.style.background = 'transparent'; }}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {loading ? (
            <div style={{ width: '80px', height: '32px' }}></div>
          ) : user ? (
            <>
              {/* Bell */}
              <div ref={notifRef} style={{ position: 'relative' }}>
                <button onClick={openNotifications} style={{
                  position: 'relative', background: 'none',
                  border: '1px solid rgba(255,255,255,0.065)', borderRadius: '8px',
                  padding: '6px 10px', cursor: 'pointer', fontSize: '18px', lineHeight: 1,
                  display: 'flex', alignItems: 'center', transition: 'all 0.2s', color: '#EEF2FF',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.22)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.065)'; }}
                >
                  🔔
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute', top: '-6px', right: '-6px',
                      background: '#EF4444', color: 'white', fontSize: '10px',
                      fontWeight: 700, borderRadius: '100px', minWidth: '18px',
                      height: '18px', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', padding: '0 4px', fontFamily: 'Syne, sans-serif',
                    }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                    width: '320px', background: '#0f1623',
                    border: '1px solid rgba(255,255,255,0.065)', borderRadius: '14px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.5)', zIndex: 300, overflow: 'hidden',
                  }}>
                    {/* Header */}
                    <div style={{
                      padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.065)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'Syne, sans-serif', color: '#EEF2FF' }}>
                        Notifications
                      </span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {unreadCount > 0 && (
                          <button onClick={markAllRead} style={{
                            fontSize: '11px', color: '#60A5FA', background: 'none',
                            border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                            padding: '2px 6px', borderRadius: '4px',
                          }}>
                            Mark all read
                          </button>
                        )}
                        {notifications.length > 0 && (
                          <button onClick={clearAllNotifications} style={{
                            fontSize: '11px', color: '#6B7A9E', background: 'none',
                            border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                            padding: '2px 6px', borderRadius: '4px',
                          }}>
                            Clear all
                          </button>
                        )}
                      </div>
                    </div>

                    {/* List */}
                    <div style={{ maxHeight: '360px', overflowY: 'auto', scrollbarWidth: 'thin' }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#6B7A9E', fontSize: '13px' }}>
                          <div style={{ fontSize: '32px', marginBottom: '0.5rem' }}>🔔</div>
                          No notifications yet
                        </div>
                      ) : notifications.map(n => (
                        <div key={n.id} style={{
                          padding: '12px 16px',
                          background: n.read ? 'transparent' : 'rgba(59,130,246,0.05)',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          display: 'flex', gap: '10px', alignItems: 'flex-start',
                        }}>
                          <div style={{
                            width: '34px', height: '34px', borderRadius: '50%',
                            background: '#151e2e', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: '15px', flexShrink: 0,
                          }}>
                            {notifIcon(n.type)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', color: '#EEF2FF', lineHeight: 1.5 }}>
                              {n.from_username ? (
                                <>
                                  <Link href={`/profile/${n.from_username}`} onClick={() => setNotifOpen(false)}
                                    style={{ color: '#60A5FA', fontWeight: 600, textDecoration: 'none' }}>
                                    @{n.from_username}
                                  </Link>
                                  {' '}
                                  {n.type === 'new_follower' ? 'started following you' :
                                   n.type === 'battle_accepted' ? 'accepted your battle challenge' : n.message}
                                </>
                              ) : n.message}
                            </div>
                            <div style={{ fontSize: '11px', color: '#6B7A9E', marginTop: '3px' }}>
                              {timeAgo(n.created_at)}
                            </div>
                          </div>
                          {!n.read && (
                            <div style={{
                              width: '7px', height: '7px', borderRadius: '50%',
                              background: '#3B82F6', flexShrink: 0, marginTop: '6px',
                            }} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile */}
              <Link href={`/profile/${profileSlug || 'profile'}`} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                textDecoration: 'none', padding: '6px 12px', borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.065)', color: '#EEF2FF',
                fontSize: '14px', transition: 'all 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.065)'; }}
              >
                <div style={{
                  width: '26px', height: '26px', borderRadius: '50%',
                  background: '#3B82F6', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '10px', fontWeight: 700,
                  color: 'white', fontFamily: 'Syne, sans-serif', flexShrink: 0,
                }}>
                  {initials}
                </div>
                <span className="nav-name-label">{truncatedName}</span>
              </Link>

              <button onClick={handleSignOut} className="nav-signout-btn" style={{
                fontSize: '14px', color: '#6B7A9E', background: 'none',
                border: '1px solid rgba(255,255,255,0.065)', borderRadius: '8px',
                padding: '7px 16px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s',
              }}
                onMouseEnter={e => { e.target.style.color = '#EEF2FF'; }}
                onMouseLeave={e => { e.target.style.color = '#6B7A9E'; }}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="nav-signin-btn" style={{
                fontSize: '14px', color: '#6B7A9E', background: 'none',
                border: '1px solid rgba(255,255,255,0.065)', borderRadius: '8px',
                padding: '7px 16px', textDecoration: 'none', transition: 'all 0.2s',
              }}>Sign in</Link>
              <Link href="/signup" style={{
                fontSize: '14px', fontWeight: 700, fontFamily: 'Syne, sans-serif',
                color: '#EEF2FF', background: '#3B82F6', borderRadius: '8px',
                padding: '8px 18px', textDecoration: 'none', transition: 'all 0.2s',
              }}>Join →</Link>
            </>
          )}

          <Link href="/search" className="nav-search-icon" style={{
            fontSize: '18px', textDecoration: 'none', padding: '6px 10px', borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.065)', transition: 'all 0.2s', lineHeight: 1,
            display: 'flex', alignItems: 'center',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.22)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.065)'; }}
          >🔍</Link>

          <button onClick={() => setMenuOpen(o => !o)} className="nav-hamburger" aria-label="Toggle menu"
            style={{
              display: 'none', background: 'none', border: '1px solid rgba(255,255,255,0.065)',
              borderRadius: '8px', padding: '7px 10px', cursor: 'pointer',
              color: '#EEF2FF', fontSize: '18px', lineHeight: 1,
            }}>
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div style={{
          position: 'fixed', top: '62px', left: 0, right: 0, zIndex: 199,
          background: 'rgba(6,9,18,0.98)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.065)',
          padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem',
        }}>
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} style={{
              fontSize: '15px', color: '#EEF2FF', textDecoration: 'none',
              padding: '12px 16px', borderRadius: '10px',
              background: '#0f1623', border: '1px solid rgba(255,255,255,0.065)', fontWeight: 500,
            }}>{link.label}</Link>
          ))}
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.065)', margin: '0.25rem 0' }}></div>
          {user ? (
            <>
              <Link href={`/profile/${profileSlug || 'profile'}`} style={{
                fontSize: '15px', color: '#60A5FA', textDecoration: 'none',
                padding: '12px 16px', borderRadius: '10px',
                background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', fontWeight: 600,
              }}>👤 My Profile (@{profileSlug})</Link>
              <div style={{
                fontSize: '15px', color: '#EEF2FF', padding: '12px 16px', borderRadius: '10px',
                background: '#0f1623', border: '1px solid rgba(255,255,255,0.065)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span>🔔 Notifications</span>
                {unreadCount > 0 && (
                  <span style={{ background: '#EF4444', color: 'white', fontSize: '11px', fontWeight: 700, borderRadius: '100px', padding: '2px 8px' }}>
                    {unreadCount}
                  </span>
                )}
              </div>
              <button onClick={handleSignOut} style={{
                fontSize: '15px', color: '#6B7A9E', background: 'none',
                border: '1px solid rgba(255,255,255,0.065)', borderRadius: '10px',
                padding: '12px 16px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', textAlign: 'left',
              }}>Sign out</button>
            </>
          ) : (
            <>
              <Link href="/login" style={{
                fontSize: '15px', color: '#EEF2FF', textDecoration: 'none',
                padding: '12px 16px', borderRadius: '10px',
                background: '#0f1623', border: '1px solid rgba(255,255,255,0.065)',
              }}>Sign in</Link>
              <Link href="/signup" style={{
                fontSize: '15px', fontWeight: 700, fontFamily: 'Syne, sans-serif',
                color: '#EEF2FF', background: '#3B82F6', borderRadius: '10px',
                padding: '12px 16px', textDecoration: 'none', textAlign: 'center',
              }}>Create Account →</Link>
            </>
          )}
        </div>
      )}

      <style>{`
        .nav-desktop-links { display: flex !important; }
        .nav-signout-btn { display: block !important; }
        .nav-signin-btn { display: block !important; }
        .nav-hamburger { display: none !important; }
        .nav-name-label { display: inline !important; }
        .nav-search-icon { display: flex !important; }
        @media (max-width: 768px) {
          .nav-desktop-links { display: none !important; }
          .nav-signout-btn { display: none !important; }
          .nav-signin-btn { display: none !important; }
          .nav-hamburger { display: block !important; }
          .nav-name-label { display: none !important; }
          .nav-search-icon { display: none !important; }
        }
      `}</style>
    </>
  );
}
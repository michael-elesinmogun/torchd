'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function NavBar() {
  const [user, setUser] = useState(null);
  const [profileSlug, setProfileSlug] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserAndProfile() {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user;
      setUser(currentUser);

      if (currentUser) {
        // Fetch real username from profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', currentUser.id)
          .single();

        if (profile?.username) {
          setProfileSlug(profile.username);
        } else {
          // Fallback to derived name if no profile yet
          const fullName = currentUser.user_metadata?.full_name || '';
          setProfileSlug(
            fullName
              ? fullName.toLowerCase().replace(/\s+/g, '')
              : currentUser.email?.split('@')[0] || 'profile'
          );
        }
      }

      setLoading(false);
    }

    fetchUserAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase
          .from('profiles')
          .select('username')
          .eq('id', session.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile?.username) {
              setProfileSlug(profile.username);
            }
          });
      } else {
        setProfileSlug(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 clamp(1rem, 4vw, 3rem)', height: '62px',
      background: 'rgba(6,9,18,0.92)', backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.065)',
      fontFamily: 'DM Sans, sans-serif',
    }}>

      <Link href="/" style={{
        fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 800,
        color: '#3B82F6', textDecoration: 'none', letterSpacing: '-0.5px',
        display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0,
      }}>
        🔥 Torchd
      </Link>

      <ul style={{
        display: 'flex', alignItems: 'center', gap: '0.25rem',
        listStyle: 'none', margin: 0, padding: 0,
      }}>
        {[
          { href: '/battle', label: 'Battle Mode' },
          { href: '/lobby', label: 'Game Lobby' },
          { href: '/leaderboard', label: 'Leaderboard' },
        ].map(link => (
          <li key={link.href}>
            <Link href={link.href} style={{
              fontSize: '14px', color: '#6B7A9E', textDecoration: 'none',
              padding: '6px 12px', borderRadius: '8px', transition: 'all 0.2s',
            }}
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
              {truncatedName}
            </Link>

            <button onClick={handleSignOut} style={{
              fontSize: '14px', color: '#6B7A9E', background: 'none',
              border: '1px solid rgba(255,255,255,0.065)', borderRadius: '8px',
              padding: '7px 16px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.target.style.color = '#EEF2FF'; }}
            onMouseLeave={e => { e.target.style.color = '#6B7A9E'; }}
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link href="/login" style={{
              fontSize: '14px', color: '#6B7A9E', background: 'none',
              border: '1px solid rgba(255,255,255,0.065)', borderRadius: '8px',
              padding: '7px 16px', textDecoration: 'none', transition: 'all 0.2s',
            }}>
              Sign in
            </Link>
            <Link href="/signup" style={{
              fontSize: '14px', fontWeight: 700, fontFamily: 'Syne, sans-serif',
              color: '#EEF2FF', background: '#3B82F6', borderRadius: '8px',
              padding: '8px 18px', textDecoration: 'none', transition: 'all 0.2s',
            }}>
              Create Account →
            </Link>
          </>
        )}
      </div>

    </nav>
  );
}
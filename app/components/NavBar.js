'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function NavBar() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  const username = user?.user_metadata?.full_name
    ?.toLowerCase()
    .replace(/\s+/g, '') || user?.email?.split('@')[0] || 'profile';

  const initials = user?.user_metadata?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || '?';

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 clamp(1rem, 4vw, 3rem)', height: '62px',
      background: 'rgba(6,9,18,0.92)', backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.065)',
      fontFamily: 'DM Sans, sans-serif',
    }}>
      <Link href="/" style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 800, color: '#3B82F6', textDecoration: 'none', letterSpacing: '-0.5px' }}>
        🔥 Torchd
      </Link>

      <ul style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', listStyle: 'none', margin: 0, padding: 0 }}>
        <li><Link href="/battle" style={{ fontSize: '14px', color: '#6B7A9E', textDecoration: 'none', padding: '6px 12px', borderRadius: '8px' }}>Battle Mode</Link></li>
        <li><Link href="/lobby" style={{ fontSize: '14px', color: '#6B7A9E', textDecoration: 'none', padding: '6px 12px', borderRadius: '8px' }}>Game Lobby</Link></li>
        <li><Link href="/leaderboard" style={{ fontSize: '14px', color: '#6B7A9E', textDecoration: 'none', padding: '6px 12px', borderRadius: '8px' }}>Leaderboard</Link></li>
      </ul>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {loading ? null : user ? (
          <>
            <Link href={`/profile/${username}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.065)', color: '#EEF2FF', fontSize: '14px' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: 'white', fontFamily: 'Syne, sans-serif' }}>
                {initials}
              </div>
              {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
            </Link>
            <button onClick={handleSignOut} style={{ fontSize: '14px', color: '#6B7A9E', background: 'none', border: '1px solid rgba(255,255,255,0.065)', borderRadius: '8px', padding: '7px 16px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link href="/login" style={{ fontSize: '14px', color: '#6B7A9E', background: 'none', border: '1px solid rgba(255,255,255,0.065)', borderRadius: '8px', padding: '7px 16px', textDecoration: 'none' }}>
              Sign in
            </Link>
            <Link href="/signup" style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'Syne, sans-serif', color: '#EEF2FF', background: '#3B82F6', borderRadius: '8px', padding: '8px 18px', textDecoration: 'none' }}>
              Create Account →
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
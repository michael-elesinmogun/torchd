'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../supabase';
import styles from './confirm.module.css';

export default function Confirm() {
  const router = useRouter();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [username, setUsername] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function handleConfirm() {
      // Supabase puts the tokens in the URL hash after email confirmation
      // The supabase client picks them up automatically on load
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        setErrorMsg(error.message);
        setStatus('error');
        return;
      }

      if (session?.user) {
        // Fetch their username from profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', session.user.id)
          .single();

        if (profile?.username) {
          setUsername(profile.username);
        }

        setStatus('success');

        // Auto-redirect to profile after 3s
        setTimeout(() => {
          router.push(profile?.username ? `/profile/${profile.username}` : '/');
        }, 3000);
      } else {
        // No session yet — might still be processing the token
        // Listen for auth state change
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', session.user.id)
              .single();

            if (profile?.username) setUsername(profile.username);
            setStatus('success');

            setTimeout(() => {
              router.push(profile?.username ? `/profile/${profile.username}` : '/');
            }, 3000);

            subscription.unsubscribe();
          }
        });

        // If nothing happens in 5s, show error
        setTimeout(() => {
          setStatus(prev => prev === 'loading' ? 'error' : prev);
          setErrorMsg('Confirmation link may have expired. Try signing in directly.');
        }, 5000);
      }
    }

    handleConfirm();
  }, [router]);

  return (
    <main className={styles.main}>
      <div className={styles.bgGlow}></div>
      <div className={styles.bgGrid}></div>

      <div className={styles.card}>

        {status === 'loading' && (
          <div className={styles.inner}>
            <div className={styles.spinner}></div>
            <h1 className={styles.title}>Confirming your email...</h1>
            <p className={styles.sub}>Just a second while we verify your account.</p>
          </div>
        )}

        {status === 'success' && (
          <div className={styles.inner}>
            <div className={styles.successIcon}>🔥</div>
            <h1 className={styles.title}>Email confirmed!</h1>
            <p className={styles.sub}>
              Your Torchd account is verified and ready to go.
              {username && <><br /><span className={styles.username}>@{username}</span></>}
              <br /><br />
              <span className={styles.redirectNote}>Taking you to your profile...</span>
            </p>
            <div className={styles.actions}>
              {username
                ? <Link href={`/profile/${username}`} className={styles.btnPrimary}>Go to my profile →</Link>
                : <Link href="/" className={styles.btnPrimary}>Go to Torchd →</Link>
              }
              <Link href="/battle" className={styles.btnSecondary}>⚔️ Start a Battle</Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className={styles.inner}>
            <div className={styles.errorIcon}>⚠️</div>
            <h1 className={styles.title}>Something went wrong</h1>
            <p className={styles.sub}>{errorMsg || 'We couldn\'t confirm your email. The link may have expired.'}</p>
            <div className={styles.actions}>
              <Link href="/login" className={styles.btnPrimary}>Sign in →</Link>
              <Link href="/signup" className={styles.btnSecondary}>Create new account</Link>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
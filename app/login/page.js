'use client';
import Link from 'next/link';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../supabase';
import styles from './login.module.css';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ email: '', password: '' });

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    setLoading(false);

    if (redirect) {
      router.push(redirect);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', data.user.id)
      .single();

    if (profile?.username) {
      router.push(`/profile/${profile.username}`);
    } else {
      router.push('/lobby');
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardIcon}>🔥</div>
        <h1 className={styles.cardTitle}>Welcome back</h1>
        <p className={styles.cardSub}>
          {redirect ? 'Sign in to continue' : 'Sign in to your Torchd account'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Email address</label>
          <input className={styles.input} type="email" name="email" placeholder="jordan@example.com" value={form.email} onChange={handleChange} required />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Password</label>
          <input className={styles.input} type="password" name="password" placeholder="Your password" value={form.password} onChange={handleChange} required />
        </div>

        {error && <div className={styles.errorMsg}>{error}</div>}

        <button type="submit" className={styles.btnPrimary} disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In →'}
        </button>
      </form>

      <p className={styles.forgotWrap}>
        <Link href="#" className={styles.forgotLink}>Forgot your password?</Link>
      </p>

      <div className={styles.divider}><span>or</span></div>

      <Link href={`/signup${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`} className={styles.btnSecondary}>
        Create a free account
      </Link>

      <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '13px', color: '#6B7A9E' }}>
        Don't have an account?{' '}
        <Link href={`/signup${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`} style={{ color: '#60A5FA', textDecoration: 'none' }}>
          Sign up free
        </Link>
      </p>
    </div>
  );
}

export default function Login() {
  return (
    <main className={styles.main}>
      <div className={styles.bgGlow}></div>
      <div className={styles.bgGrid}></div>
      <Suspense fallback={<div style={{ color: '#6B7A9E', textAlign: 'center', paddingTop: '4rem' }}>Loading...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
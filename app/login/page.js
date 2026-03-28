'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../supabase';
import styles from './login.module.css';

export default function Login() {
  const router = useRouter();
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

    // Fetch username from profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', data.user.id)
      .single();

    setLoading(false);

    if (profile?.username) {
      router.push(`/profile/${profile.username}`);
    } else {
      // Fallback to homepage if no profile yet
      router.push('/');
    }
  }

  return (
    <main className={styles.main}>

      <div className={styles.bgGlow}></div>
      <div className={styles.bgGrid}></div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardIcon}>🔥</div>
          <h1 className={styles.cardTitle}>Welcome back</h1>
          <p className={styles.cardSub}>Sign in to your Torchd account</p>
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

        <Link href="/signup" className={styles.btnSecondary}>Create a free account</Link>

        <p style={{textAlign:'center',marginTop:'1rem',fontSize:'13px',color:'#6B7A9E'}}>
          Don't have an account? <Link href="/signup" style={{color:'#60A5FA',textDecoration:'none'}}>Sign up free</Link>
        </p>
      </div>

    </main>
  );
}
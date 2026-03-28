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
 
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });
 
    setLoading(false);
 
    if (error) {
      setError(error.message);
      return;
    }
 
    router.push('/');
  }
 
  return (
    <main className={styles.main}>
 
      <div className={styles.bgGlow}></div>
      <div className={styles.bgGrid}></div>
 
      <nav className={styles.nav}>
        <Link href="/" className={styles.logo}>🔥 Torchd</Link>
        <p className={styles.navNote}>Don't have an account? <Link href="/signup" className={styles.navLink}>Sign up free</Link></p>
      </nav>
 
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardIcon}>🔥</div>
          <h1 className={styles.cardTitle}>Welcome back</h1>
          <p className={styles.cardSub}>Sign in to your Torchd account</p>
        </div>
 
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Email address</label>
            <input
              className={styles.input}
              type="email"
              name="email"
              placeholder="jordan@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>
 
          <div className={styles.formGroup}>
            <label className={styles.label}>Password</label>
            <input
              className={styles.input}
              type="password"
              name="password"
              placeholder="Your password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>
 
          {error && (
            <div className={styles.errorMsg}>{error}</div>
          )}
 
          <button type="submit" className={styles.btnPrimary} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
        </form>
 
        <p className={styles.forgotWrap}>
          <Link href="#" className={styles.forgotLink}>Forgot your password?</Link>
        </p>
 
        <div className={styles.divider}>
          <span>or</span>
        </div>
 
        <Link href="/signup" className={styles.btnSecondary}>
          Create a free account
        </Link>
      </div>
 
    </main>
  );
}
 
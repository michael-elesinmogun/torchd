'use client';
import Link from 'next/link';
import { useState } from 'react';
import { supabase } from '../supabase';
import styles from './signup.module.css';
 
export default function Signup() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', sport: '' });
 
  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }
 
  function handleNext(e) {
    e.preventDefault();
    setStep(2);
  }
 
  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
 
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.name,
          sport: form.sport,
        }
      }
    });
 
    setLoading(false);
 
    if (error) {
      setError(error.message);
      return;
    }
 
    setStep(3);
  }
 
  return (
    <main className={styles.main}>
 
      {/* Background */}
      <div className={styles.bgGlow}></div>
      <div className={styles.bgGrid}></div>
 
      {/* Nav */}
      <nav className={styles.nav}>
        <Link href="/" className={styles.logo}>🔥 Torchd</Link>
        <p className={styles.navNote}>Already have an account? <Link href="/login" className={styles.navLink}>Sign in</Link></p>
      </nav>
 
      {/* Card */}
      <div className={styles.card}>
 
        {/* Step 1 — Account details */}
        {step === 1 && (
          <div className={styles.stepWrap}>
            <div className={styles.stepIndicator}>
              <div className={`${styles.stepDot} ${styles.active}`}></div>
              <div className={styles.stepLine}></div>
              <div className={styles.stepDot}></div>
            </div>
 
            <div className={styles.cardHeader}>
              <div className={styles.cardIcon}>⚔️</div>
              <h1 className={styles.cardTitle}>Create your account</h1>
              <p className={styles.cardSub}>Join 2,400+ fans already debating on Torchd</p>
            </div>
 
            <form onSubmit={handleNext} className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Full name</label>
                <input
                  className={styles.input}
                  type="text"
                  name="name"
                  placeholder="Jordan Kim"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>
 
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
                  placeholder="At least 8 characters"
                  value={form.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                />
              </div>
 
              <button type="submit" className={styles.btnPrimary}>
                Continue →
              </button>
            </form>
 
            <p className={styles.terms}>
              By creating an account you agree to our <Link href="#" className={styles.termLink}>Terms of Service</Link> and <Link href="#" className={styles.termLink}>Privacy Policy</Link>
            </p>
          </div>
        )}
 
        {/* Step 2 — Pick your sports */}
        {step === 2 && (
          <div className={styles.stepWrap}>
            <div className={styles.stepIndicator}>
              <div className={`${styles.stepDot} ${styles.done}`}>✓</div>
              <div className={`${styles.stepLine} ${styles.lineDone}`}></div>
              <div className={`${styles.stepDot} ${styles.active}`}></div>
            </div>
 
            <div className={styles.cardHeader}>
              <div className={styles.cardIcon}>🏆</div>
              <h1 className={styles.cardTitle}>What do you debate?</h1>
              <p className={styles.cardSub}>Pick your sports so we can match you with the right opponents</p>
            </div>
 
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.sportsGrid}>
                {[
                  {key:'nba', icon:'🏀', label:'NBA'},
                  {key:'nfl', icon:'🏈', label:'NFL'},
                  {key:'soccer', icon:'⚽', label:'Soccer'},
                  {key:'mlb', icon:'⚾', label:'MLB'},
                  {key:'nhl', icon:'🏒', label:'NHL'},
                  {key:'all', icon:'🔥', label:'All Sports'},
                ].map(s => (
                  <button
                    key={s.key}
                    type="button"
                    className={`${styles.sportBtn} ${form.sport === s.key ? styles.sportSelected : ''}`}
                    onClick={() => setForm({...form, sport: s.key})}
                  >
                    <span className={styles.sportIcon}>{s.icon}</span>
                    <span className={styles.sportLabel}>{s.label}</span>
                  </button>
                ))}
              </div>
 
              {error && (
                <div className={styles.errorMsg}>{error}</div>
              )}
 
              <button type="submit" className={styles.btnPrimary} disabled={!form.sport || loading}>
                {loading ? 'Creating account...' : 'Create Account →'}
              </button>
 
              <button type="button" className={styles.btnBack} onClick={() => setStep(1)}>
                ← Back
              </button>
            </form>
          </div>
        )}
 
        {/* Step 3 — Success */}
        {step === 3 && (
          <div className={styles.stepWrap}>
            <div className={styles.successWrap}>
              <div className={styles.successIcon}>🔥</div>
              <h1 className={styles.cardTitle}>You're in!</h1>
              <p className={styles.cardSub}>Welcome to Torchd, {form.name.split(' ')[0]}. Check your email to confirm your account, then start debating.</p>
 
              <div className={styles.successActions}>
                <Link href="/battle" className={styles.btnPrimary}>
                  ⚔️ Start a Battle
                </Link>
                <Link href="/lobby" className={styles.btnSecondary}>
                  🏟️ Join a Lobby
                </Link>
              </div>
            </div>
          </div>
        )}
 
      </div>
 
    </main>
  );
}
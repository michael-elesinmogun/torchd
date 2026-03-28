'use client';
import Link from 'next/link';
import { useState } from 'react';
import { supabase } from '../supabase';
import styles from './signup.module.css';

export default function Signup() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', sport: '' });

  function handleChange(e) {
    // Auto-clean username as they type
    if (e.target.name === 'username') {
      setForm({ ...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') });
    } else {
      setForm({ ...form, [e.target.name]: e.target.value });
    }
  }

  async function handleNext(e) {
    e.preventDefault();
    setError(null);

    if (form.username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    // Check username availability
    const { data: existing } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', form.username)
      .single();

    if (existing) {
      setError('That username is taken — try another');
      return;
    }

    setStep(2);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Create auth account
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.name,
          username: form.username,
          sport: form.sport,
        }
      }
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Save profile with username
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        username: form.username,
        full_name: form.name,
        sport: form.sport,
      });
    }

    setLoading(false);
    setStep(3);
  }

  return (
    <main className={styles.main}>

      <div className={styles.bgGlow}></div>
      <div className={styles.bgGrid}></div>

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
                  placeholder="John Smith"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Username</label>
                <div className={styles.usernameWrap}>
                  <span className={styles.usernamePrefix}>@</span>
                  <input
                    className={styles.usernameInput}
                    type="text"
                    name="username"
                    placeholder="yourusername"
                    value={form.username}
                    onChange={handleChange}
                    required
                    minLength={3}
                    maxLength={20}
                  />
                </div>
                {form.username && (
                  <div className={styles.usernamePreview}>
                    torchd.vercel.app/profile/{form.username}
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Email address</label>
                <input
                  className={styles.input}
                  type="email"
                  name="email"
                  placeholder="you@example.com"
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

              {error && <div className={styles.errorMsg}>{error}</div>}

              <button type="submit" className={styles.btnPrimary}>
                Continue →
              </button>
            </form>

            <p className={styles.terms}>
              By creating an account you agree to our <Link href="#" className={styles.termLink}>Terms of Service</Link> and <Link href="#" className={styles.termLink}>Privacy Policy</Link>
            </p>
            <p style={{textAlign:'center',marginTop:'1rem',fontSize:'13px',color:'#6B7A9E'}}>
              Already have an account? <Link href="/login" style={{color:'#60A5FA',textDecoration:'none'}}>Sign in</Link>
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

              {error && <div className={styles.errorMsg}>{error}</div>}

              <button type="submit" className={styles.btnPrimary} disabled={!form.sport || loading}>
                {loading ? 'Creating account...' : 'Create Account →'}
              </button>
              <button type="button" className={styles.btnBack} onClick={() => setStep(1)}>← Back</button>
            </form>
          </div>
        )}

        {/* Step 3 — Success */}
        {step === 3 && (
          <div className={styles.stepWrap}>
            <div className={styles.successWrap}>
              <div className={styles.successIcon}>🔥</div>
              <h1 className={styles.cardTitle}>You're in, @{form.username}!</h1>
              <p className={styles.cardSub}>Welcome to Torchd, {form.name.split(' ')[0]}. Check your email to confirm your account, then start debating.</p>
              <div className={styles.successActions}>
                <Link href={`/profile/${form.username}`} className={styles.btnPrimary}>View my profile →</Link>
                <Link href="/battle" className={styles.btnSecondary}>⚔️ Start a Battle</Link>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
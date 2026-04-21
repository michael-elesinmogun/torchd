'use client';
import { useEffect, useState } from 'react';

export default function ThemeProvider() {
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('torchd-theme');
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
    } else {
      // First visit — show picker, default to dark while they decide
      document.documentElement.setAttribute('data-theme', 'dark');
      setShowPicker(true);
    }
  }, []);

  function pick(theme) {
    localStorage.setItem('torchd-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    setShowPicker(false);
  }

  if (!showPicker) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'DM Sans, sans-serif',
    }}>
      <div style={{
        background: '#0f1623', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '20px', padding: '2.5rem 2rem', maxWidth: '420px',
        width: '90%', textAlign: 'center',
      }}>
        <div style={{ fontSize: '36px', marginBottom: '1rem' }}>🔥</div>
        <div style={{
          fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 800,
          color: '#EEF2FF', marginBottom: '0.5rem',
        }}>Choose your look</div>
        <p style={{ fontSize: '14px', color: '#6B7A9E', marginBottom: '2rem', lineHeight: 1.6 }}>
          Pick a theme for Torchd. You can always change it later in Settings.
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => pick('dark')} style={{
            flex: 1, background: '#060912', border: '2px solid rgba(255,255,255,0.1)',
            borderRadius: '14px', padding: '1.25rem 1rem', cursor: 'pointer',
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#3B82F6'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
          >
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🌙</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: '#EEF2FF', marginBottom: '4px' }}>Dark</div>
            <div style={{ fontSize: '12px', color: '#6B7A9E' }}>Easy on the eyes</div>
          </button>

          <button onClick={() => pick('light')} style={{
            flex: 1, background: '#F4F6FB', border: '2px solid rgba(0,0,0,0.08)',
            borderRadius: '14px', padding: '1.25rem 1rem', cursor: 'pointer',
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#2563EB'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'}
          >
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>☀️</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: '#0D1117', marginBottom: '4px' }}>Light</div>
            <div style={{ fontSize: '12px', color: '#64748B' }}>Clean and bright</div>
          </button>
        </div>
      </div>
    </div>
  );
}
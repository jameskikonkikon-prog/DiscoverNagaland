'use client';
import { useState, useEffect } from 'react';

const COOKIE_NAME = 'terms_accepted';

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  return document.cookie.split('; ').find(r => r.startsWith(name + '='))?.split('=')[1];
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
}

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!getCookie(COOKIE_NAME)) setVisible(true);
  }, []);

  const accept = () => {
    setCookie(COOKIE_NAME, 'true', 365);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 999,
      background: '#1a1a1a', borderTop: '1px solid rgba(255,255,255,0.08)',
      padding: '14px 24px 80px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
      fontFamily: "'Sora', sans-serif",
    }}>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.55, margin: 0 }}>
        By using Yana Nagaland, you agree to our{' '}
        <a href="/terms" style={{ color: '#c0392b', textDecoration: 'none' }}>Terms of Service</a>
        {' '}and{' '}
        <a href="/privacy" style={{ color: '#c0392b', textDecoration: 'none' }}>Privacy Policy</a>.
      </p>
      <button
        onClick={accept}
        style={{
          flexShrink: 0, padding: '8px 20px',
          background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 8, color: 'rgba(255,255,255,0.7)', fontSize: 13,
          fontFamily: "'Sora', sans-serif", fontWeight: 600,
          cursor: 'pointer', whiteSpace: 'nowrap', transition: 'border-color 0.15s, color 0.15s',
        }}
        onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.3)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
        onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.15)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.7)'; }}
      >
        Got it
      </button>
    </div>
  );
}

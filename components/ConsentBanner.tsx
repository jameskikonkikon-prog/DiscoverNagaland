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
    <>
      <style>{`
        .consent-bar{position:fixed;bottom:0;left:0;right:0;z-index:999;background:#1a1a1a;border-top:1px solid rgba(255,255,255,0.08);padding:14px 20px 20px;display:flex;align-items:center;justify-content:space-between;gap:12;flex-wrap:wrap;font-family:'Sora',sans-serif;}
        .consent-btn{flex-shrink:0;padding:12px 20px;min-height:44px;background:transparent;border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:rgba(255,255,255,0.7);font-size:14px;font-family:'Sora',sans-serif;font-weight:600;cursor:pointer;white-space:nowrap;transition:border-color 0.15s,color 0.15s;}
        .consent-btn:hover{border-color:rgba(255,255,255,0.3);color:#fff;}
      `}</style>
      <div className="consent-bar">
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.55, margin: 0 }}>
          By using Yana Nagaland, you agree to our{' '}
          <a href="/terms" style={{ color: '#c0392b', textDecoration: 'none' }}>Terms of Service</a>
          {' '}and{' '}
          <a href="/privacy" style={{ color: '#c0392b', textDecoration: 'none' }}>Privacy Policy</a>.
        </p>
        <button onClick={accept} className="consent-btn">Got it</button>
      </div>
    </>
  );
}

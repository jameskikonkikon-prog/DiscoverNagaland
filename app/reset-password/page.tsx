'use client';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function ResetPasswordPage() {
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState('');

  useEffect(() => {
    async function init() {
      // PKCE flow: Supabase sends ?code= as a query param
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code) {
        const { error: exchErr } = await supabase.auth.exchangeCodeForSession(code);
        if (exchErr) { setSessionError('Invalid or expired reset link. Please request a new one.'); setChecking(false); return; }
        setSessionReady(true); setChecking(false); return;
      }

      // Implicit flow: Supabase sends #access_token=...&type=recovery in the hash
      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
        // createBrowserClient processes the hash automatically; give it a tick
        await new Promise(r => setTimeout(r, 150));
        const { data } = await supabase.auth.getSession();
        if (data.session) { setSessionReady(true); setChecking(false); return; }
      }

      setSessionError('Invalid or expired reset link. Please request a new one.');
      setChecking(false);
    }
    init();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match."); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) { setError(err.message || 'Failed to update password. Please try again.'); return; }
    setDone(true);
  };

  return (
    <>
      <style>{styles}</style>
      <main className="rp-page">
        <div className="rp-card">
          <div className="card-accent" />
          <a href="/" className="rp-brand">
            <span className="brand-name">Yana</span>
            <span className="brand-sub">NAGALAND</span>
          </a>

          {checking ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem', opacity: 0.5 }}>⏳</div>
              <p className="rp-sub" style={{ marginBottom: 0 }}>Verifying reset link…</p>
            </div>
          ) : sessionError ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔗</div>
              <h1 className="rp-title">Link invalid or expired</h1>
              <p className="rp-sub" style={{ marginBottom: '2rem' }}>{sessionError}</p>
              <a href="/forgot-password" className="rp-btn" style={{ display: 'inline-block', textDecoration: 'none', textAlign: 'center' }}>
                Request a new link
              </a>
              <div className="rp-footer" style={{ marginTop: '1rem' }}>
                <a href="/login">← Back to login</a>
              </div>
            </div>
          ) : done ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✅</div>
              <h1 className="rp-title">Password updated!</h1>
              <p className="rp-sub" style={{ marginBottom: '2rem' }}>
                Your password has been changed. You can now sign in with your new password.
              </p>
              <a href="/login" className="rp-btn" style={{ display: 'inline-block', textDecoration: 'none', textAlign: 'center' }}>
                Go to Login →
              </a>
            </div>
          ) : sessionReady ? (
            <>
              <h1 className="rp-title">Set new password</h1>
              <p className="rp-sub">Choose a new password for your account.</p>
              <form onSubmit={handleSubmit} className="rp-form">
                <div className="field">
                  <label>New Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" required />
                </div>
                <div className="field">
                  <label>Confirm Password</label>
                  <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Same password again" required />
                  {confirm && password !== confirm && (
                    <p style={{ fontSize: '0.76rem', color: '#f87171', marginTop: '0.35rem' }}>Passwords don&apos;t match</p>
                  )}
                </div>
                {error && <div className="error-msg">{error}</div>}
                <button type="submit" className="rp-btn" disabled={loading || (!!confirm && password !== confirm)}>
                  {loading ? 'Updating…' : 'Update Password'}
                </button>
              </form>
              <div className="rp-footer">
                <a href="/login">← Back to login</a>
              </div>
            </>
          ) : null}
        </div>
      </main>
    </>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Sora:wght@300;400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .rp-page {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    padding: 2rem 1.5rem; background: #0a0a0a; font-family: 'Sora', sans-serif; position: relative;
  }
  .rp-page::before {
    content: ''; position: fixed; inset: 0;
    background: radial-gradient(ellipse 50% 40% at 15% 10%, rgba(192,57,43,0.06) 0%, transparent 60%),
                radial-gradient(ellipse 40% 40% at 85% 85%, rgba(212,160,23,0.03) 0%, transparent 60%);
    pointer-events: none;
  }
  .rp-card {
    background: #141414; border: 1px solid #222; border-radius: 20px;
    padding: 2.5rem 2rem; width: 100%; max-width: 420px;
    position: relative; overflow: hidden; box-shadow: 0 24px 64px rgba(0,0,0,0.6); z-index: 1;
  }
  .card-accent { position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, #c0392b, transparent); }
  .rp-brand { display: flex; align-items: baseline; gap: 6px; justify-content: center; text-decoration: none; margin-bottom: 2rem; }
  .brand-name { font-family: 'Playfair Display', serif; font-size: 1.6rem; font-weight: 700; color: #fff; letter-spacing: 1px; }
  .brand-sub { font-size: 0.52rem; letter-spacing: 0.35em; color: #666; text-transform: uppercase; }
  .rp-title { font-family: 'Playfair Display', serif; font-size: 1.6rem; color: #fff; margin-bottom: 8px; text-align: center; }
  .rp-sub { font-size: 0.85rem; color: #666; text-align: center; margin-bottom: 1.75rem; line-height: 1.6; }
  .rp-form { display: flex; flex-direction: column; gap: 0; }
  .field { margin-bottom: 1.1rem; }
  .field label { display: block; font-size: 0.72rem; color: #c0392b; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 6px; font-weight: 600; }
  .field input {
    width: 100%; padding: 12px 14px; background: rgba(0,0,0,0.4);
    border: 1.5px solid #2a2a2a; border-radius: 10px; color: #fff;
    font-family: 'Sora', sans-serif; font-size: 0.92rem; outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .field input::placeholder { color: #444; }
  .field input:focus { border-color: #c0392b; box-shadow: 0 0 0 3px rgba(192,57,43,0.1); }
  .error-msg { background: rgba(180,40,40,0.12); border: 1px solid rgba(180,40,40,0.3); border-radius: 8px; padding: 10px 14px; font-size: 0.82rem; color: #ff8080; margin-bottom: 1rem; }
  .rp-btn {
    width: 100%; padding: 13px; border: none; border-radius: 10px;
    background: #c0392b; color: #fff; font-family: 'Sora', sans-serif;
    font-size: 0.95rem; font-weight: 700; cursor: pointer;
    box-shadow: 0 4px 16px rgba(192,57,43,0.25); transition: all 0.15s;
  }
  .rp-btn:hover:not(:disabled) { background: #e74c3c; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(192,57,43,0.35); }
  .rp-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .rp-footer { text-align: center; margin-top: 1.5rem; font-size: 0.82rem; }
  .rp-footer a { color: #c0392b; text-decoration: none; }
  .rp-footer a:hover { text-decoration: underline; }
  @media (max-width: 480px) { .rp-card { padding: 2rem 1.5rem; } }
`;

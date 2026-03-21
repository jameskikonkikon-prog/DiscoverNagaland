'use client';
import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function ForgotPasswordPage() {
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const origin = window.location.origin;
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
    });
    setLoading(false);
    if (err) { setError(err.message || 'Something went wrong. Please try again.'); return; }
    setSent(true);
  };

  return (
    <>
      <style>{styles}</style>
      <main className="fp-page">
        <div className="fp-card">
          <div className="card-accent" />
          <a href="/" className="fp-brand">
            <span className="brand-name">Yana</span>
            <span className="brand-sub">NAGALAND</span>
          </a>

          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📧</div>
              <h1 className="fp-title">Check your email</h1>
              <p className="fp-sub" style={{ marginBottom: '2rem' }}>
                We sent a password reset link to <strong style={{ color: '#fff' }}>{email}</strong>. Check your spam folder if you don&apos;t see it.
              </p>
              <a href="/login" className="fp-back-link">← Back to login</a>
            </div>
          ) : (
            <>
              <h1 className="fp-title">Forgot password?</h1>
              <p className="fp-sub">Enter your email and we&apos;ll send you a reset link.</p>
              <form onSubmit={handleSubmit} className="fp-form">
                <div className="field">
                  <label>Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" required />
                </div>
                {error && <div className="error-msg">{error}</div>}
                <button type="submit" className="fp-btn" disabled={loading}>
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
              <div className="fp-footer">
                <a href="/login">← Back to login</a>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Sora:wght@300;400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .fp-page {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    padding: 2rem 1.5rem; background: #0a0a0a; font-family: 'Sora', sans-serif; position: relative;
  }
  .fp-page::before {
    content: ''; position: fixed; inset: 0;
    background: radial-gradient(ellipse 50% 40% at 15% 10%, rgba(192,57,43,0.06) 0%, transparent 60%),
                radial-gradient(ellipse 40% 40% at 85% 85%, rgba(212,160,23,0.03) 0%, transparent 60%);
    pointer-events: none;
  }
  .fp-card {
    background: #141414; border: 1px solid #222; border-radius: 20px;
    padding: 2.5rem 2rem; width: 100%; max-width: 420px;
    position: relative; overflow: hidden; box-shadow: 0 24px 64px rgba(0,0,0,0.6); z-index: 1;
  }
  .card-accent { position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, #c0392b, transparent); }
  .fp-brand { display: flex; align-items: baseline; gap: 6px; justify-content: center; text-decoration: none; margin-bottom: 2rem; }
  .brand-name { font-family: 'Playfair Display', serif; font-size: 1.6rem; font-weight: 700; color: #fff; letter-spacing: 1px; }
  .brand-sub { font-size: 0.52rem; letter-spacing: 0.35em; color: #666; text-transform: uppercase; }
  .fp-title { font-family: 'Playfair Display', serif; font-size: 1.6rem; color: #fff; margin-bottom: 8px; text-align: center; }
  .fp-sub { font-size: 0.85rem; color: #666; text-align: center; margin-bottom: 1.75rem; line-height: 1.6; }
  .fp-form { display: flex; flex-direction: column; gap: 0; }
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
  .fp-btn {
    width: 100%; padding: 13px; border: none; border-radius: 10px;
    background: #c0392b; color: #fff; font-family: 'Sora', sans-serif;
    font-size: 0.95rem; font-weight: 700; cursor: pointer;
    box-shadow: 0 4px 16px rgba(192,57,43,0.25); transition: all 0.15s;
  }
  .fp-btn:hover:not(:disabled) { background: #e74c3c; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(192,57,43,0.35); }
  .fp-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .fp-footer { text-align: center; margin-top: 1.5rem; font-size: 0.82rem; }
  .fp-footer a { color: #c0392b; text-decoration: none; }
  .fp-footer a:hover { text-decoration: underline; }
  .fp-back-link { font-size: 0.85rem; color: #c0392b; text-decoration: none; }
  .fp-back-link:hover { text-decoration: underline; }
  @media (max-width: 480px) { .fp-card { padding: 2rem 1.5rem; } }
`;

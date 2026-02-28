'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError('Wrong email or password. Please try again.');
      setLoading(false);
      return;
    }
    router.push('/dashboard');
  };

  return (
    <>
      <style>{styles}</style>
      <main className="auth-page">
        <div className="auth-card">
          <a href="/" className="auth-brand">Discover<span>Nagaland</span></a>
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-sub">Sign in to manage your business listing</p>

          <form onSubmit={handleLogin} className="auth-form">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="form-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className="form-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && <div className="error-msg">{error}</div>}

            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>

          <div className="auth-footer">
            Don&apos;t have an account? <a href="/register">List your business →</a>
          </div>
        </div>
      </main>
    </>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Outfit:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0d1a0d; font-family: 'Outfit', sans-serif; }
  .auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem 1.5rem; background: radial-gradient(ellipse at 30% 20%, rgba(201,150,58,0.06) 0%, transparent 60%), #0d1a0d; }
  .auth-card { background: linear-gradient(145deg, #1a2e1a, #152515); border: 1px solid rgba(201,150,58,0.15); border-radius: 20px; padding: 2.5rem 2rem; width: 100%; max-width: 420px; position: relative; overflow: hidden; box-shadow: 0 24px 64px rgba(0,0,0,0.5); }
  .auth-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, #c9963a, transparent); }
  .auth-brand { display: block; font-family: 'Playfair Display', serif; font-size: 1.4rem; color: #e8ddd0; text-decoration: none; margin-bottom: 2rem; text-align: center; }
  .auth-brand span { color: #c9963a; }
  .auth-title { font-family: 'Playfair Display', serif; font-size: 1.7rem; color: #e8ddd0; margin-bottom: 0.4rem; text-align: center; }
  .auth-sub { font-size: 0.85rem; color: #8a9a8a; text-align: center; margin-bottom: 2rem; }
  .auth-form { display: flex; flex-direction: column; gap: 0; }
  .form-group { margin-bottom: 1.1rem; }
  .form-label { display: block; font-size: 0.74rem; color: #c9963a; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 0.45rem; font-weight: 600; }
  .form-input { width: 100%; padding: 0.85rem 1rem; background: rgba(0,0,0,0.25); border: 1.5px solid rgba(201,150,58,0.15); border-radius: 10px; color: #e8ddd0; font-family: 'Outfit', sans-serif; font-size: 0.95rem; outline: none; transition: border-color 0.2s, box-shadow 0.2s; }
  .form-input::placeholder { color: #3a4a3a; }
  .form-input:focus { border-color: #c9963a; box-shadow: 0 0 0 3px rgba(201,150,58,0.1); }
  .error-msg { background: rgba(180,40,40,0.12); border: 1px solid rgba(180,40,40,0.3); border-radius: 8px; padding: 0.7rem 1rem; font-size: 0.85rem; color: #ff8080; margin-bottom: 1rem; }
  .auth-btn { width: 100%; padding: 0.9rem; background: linear-gradient(135deg, #c9963a, #a07020); border: none; border-radius: 10px; color: #000d00; font-family: 'Outfit', sans-serif; font-size: 1rem; font-weight: 700; cursor: pointer; transition: transform 0.15s, box-shadow 0.2s, opacity 0.2s; margin-top: 0.5rem; }
  .auth-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(201,150,58,0.35); }
  .auth-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .auth-footer { text-align: center; margin-top: 1.5rem; font-size: 0.85rem; color: #8a9a8a; }
  .auth-footer a { color: #c9963a; text-decoration: none; }
  .auth-footer a:hover { text-decoration: underline; }
`;

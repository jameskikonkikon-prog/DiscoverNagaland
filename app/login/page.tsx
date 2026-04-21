'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );
  const router = useRouter();
  const [mode, setMode] = useState<'email' | 'whatsapp'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('verified') === 'true') setVerified(true);
  }, []);

  const handleGoogleLogin = async () => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get('redirect') ?? '';
    const redirectTo = `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`;
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
  };

  const getSmartDestination = async (userId: string): Promise<string> => {
    const params = new URLSearchParams(window.location.search);
    if (localStorage.getItem('yana_pending_plan')) return '/pricing';
    const explicit = params.get('redirect');
    if (explicit) return explicit;

    const [bizRes, propRes] = await Promise.all([
      supabase.from('businesses').select('id', { count: 'exact', head: true }).eq('owner_id', userId),
      supabase.from('properties').select('id', { count: 'exact', head: true }).eq('owner_id', userId),
    ]);
    const hasBiz = (bizRes.count ?? 0) > 0;
    const hasProp = (propRes.count ?? 0) > 0;
    if (hasBiz && !hasProp) return '/dashboard';
    if (hasProp && !hasBiz) return '/real-estate/dashboard';
    if (hasBiz && hasProp) return '/dashboard/select';
    return '/account';
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError('Wrong email or password. Please try again.');
      setLoading(false);
      return;
    }
    router.push(await getSmartDestination(data.user.id));
  };

  const handleSendOtp = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10) {
      setError('Enter a valid phone number.');
      return;
    }
    setLoading(true);
    setError('');
    const fullPhone = cleaned.length === 10 ? `+91${cleaned}` : `+${cleaned}`;
    const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
    if (error) {
      setError(error.message || 'Failed to send OTP. Please try again.');
      setLoading(false);
      return;
    }
    setOtpSent(true);
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const cleaned = phone.replace(/\D/g, '');
    const fullPhone = cleaned.length === 10 ? `+91${cleaned}` : `+${cleaned}`;
    const { error, data } = await supabase.auth.verifyOtp({ phone: fullPhone, token: otp, type: 'sms' });
    if (error) {
      setError('Invalid OTP. Please try again.');
      setLoading(false);
      return;
    }
    router.push(await getSmartDestination(data.user.id));
  };

  return (
    <>
      <style>{styles}</style>
      <main className="login-page">
        <div className="login-card">
          {/* Top accent line */}
          <div className="card-accent" />

          {verified && (
            <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '8px', padding: '10px 14px', marginBottom: '1.25rem', fontSize: '0.84rem', color: '#4ade80', lineHeight: 1.5 }}>
              ✓ Email verified! You can now sign in.
            </div>
          )}

          {/* Logo */}
          <a href="/" className="login-brand">
            <svg width="38" height="44" viewBox="0 0 120 140" fill="none">
              <defs>
                <linearGradient id="pG" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8B0000"/><stop offset="50%" stopColor="#c0392b"/><stop offset="100%" stopColor="#922B21"/>
                </linearGradient>
                <linearGradient id="fG" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8B0000"/><stop offset="60%" stopColor="#c0392b"/><stop offset="100%" stopColor="#1a1a1a"/>
                </linearGradient>
                <radialGradient id="gG" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#1a1a1a"/><stop offset="100%" stopColor="#0d0d0d"/>
                </radialGradient>
              </defs>
              <g transform="rotate(-35, 45, 30)">
                <path d="M20 55 C10 40 15 15 40 0 C50 10 55 30 40 45 Z" fill="url(#fG)"/>
                <circle cx="20" cy="55" r="3" fill="#D4A017"/><circle cx="20" cy="55" r="1.5" fill="#8B0000"/>
              </g>
              <path d="M60 18 C38 18 20 36 20 58 C20 82 60 120 60 120 C60 120 100 82 100 58 C100 36 82 18 60 18Z" fill="url(#pG)"/>
              <path d="M42 35 L60 48 L78 35" stroke="rgba(0,0,0,0.3)" strokeWidth="2" fill="none"/>
              <path d="M50 72 L60 62 L70 72 L60 82 Z" stroke="rgba(212,160,23,0.5)" strokeWidth="1" fill="rgba(0,0,0,0.15)"/>
              <circle cx="60" cy="58" r="19" fill="url(#gG)" stroke="white" strokeWidth="2.5"/>
              <path d="M54 52 L68 66" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M54 52 L54 60 L62 52 Z" fill="white"/>
              <line x1="74" y1="72" x2="84" y2="82" stroke="white" strokeWidth="4" strokeLinecap="round"/>
            </svg>
            <div className="brand-text">
              <span className="brand-name">Yana</span>
              <span className="brand-sub">NAGALAND</span>
            </div>
          </a>

          <h1 className="login-title">Welcome back</h1>
          <p className="login-sub">Sign in to your account</p>

          {/* Google OAuth */}
          <button type="button" className="google-btn" onClick={handleGoogleLogin}>
            <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="or-divider"><span>or</span></div>

          {/* Mode toggle */}
          <div className="mode-toggle">
            <button className={`mode-btn ${mode === 'email' ? 'active' : ''}`} onClick={() => { setMode('email'); setError(''); }}>
              Email &amp; Password
            </button>
            <button className={`mode-btn ${mode === 'whatsapp' ? 'active' : ''}`} onClick={() => { setMode('whatsapp'); setError(''); setOtpSent(false); }}>
              WhatsApp OTP
            </button>
          </div>

          {/* Email login */}
          {mode === 'email' && (
            <form onSubmit={handleEmailLogin} className="login-form">
              <div className="field">
                <label>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" required />
              </div>
              <div className="field">
                <label>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" required />
              </div>
              {error && <div className="error-msg">{error}</div>}
              <button type="submit" className="login-btn email-btn" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
              <div style={{ textAlign: 'right', marginTop: '10px' }}>
                <a href="/forgot-password" style={{ fontSize: '0.78rem', color: '#666', textDecoration: 'none' }}
                  onMouseOver={e => (e.currentTarget.style.color = '#c0392b')}
                  onMouseOut={e => (e.currentTarget.style.color = '#666')}>
                  Forgot password?
                </a>
              </div>
            </form>
          )}

          {/* WhatsApp OTP login */}
          {mode === 'whatsapp' && (
            <div className="login-form">
              {!otpSent ? (
                <>
                  <div className="field">
                    <label>WhatsApp Number</label>
                    <div className="phone-row">
                      <span className="phone-prefix">+91</span>
                      <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="98XXXXXXXX" maxLength={10} />
                    </div>
                  </div>
                  {error && <div className="error-msg">{error}</div>}
                  <button type="button" className="login-btn whatsapp-btn" onClick={handleSendOtp} disabled={loading}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    {loading ? 'Sending OTP...' : 'Send OTP via WhatsApp'}
                  </button>
                </>
              ) : (
                <form onSubmit={handleVerifyOtp}>
                  <div className="otp-sent-msg">OTP sent to +91{phone.replace(/\D/g, '')}</div>
                  <div className="field">
                    <label>Enter OTP</label>
                    <input type="text" value={otp} onChange={e => setOtp(e.target.value)} placeholder="6-digit code" maxLength={6} required autoFocus />
                  </div>
                  {error && <div className="error-msg">{error}</div>}
                  <button type="submit" className="login-btn whatsapp-btn" disabled={loading}>
                    {loading ? 'Verifying...' : 'Verify & Sign In'}
                  </button>
                  <button type="button" className="resend-btn" onClick={() => { setOtpSent(false); setOtp(''); setError(''); }}>
                    Resend OTP
                  </button>
                </form>
              )}
            </div>
          )}

          <div className="login-footer">
            Don&apos;t have an account? <a href="/register">Create account</a>
          </div>
        </div>
      </main>
    </>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Sora:wght@300;400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .login-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem 1.5rem;
    background: #0a0a0a;
    font-family: 'Sora', sans-serif;
    position: relative;
  }
  .login-page::before {
    content: '';
    position: fixed; inset: 0;
    background:
      radial-gradient(ellipse 50% 40% at 15% 10%, rgba(192,57,43,0.06) 0%, transparent 60%),
      radial-gradient(ellipse 40% 40% at 85% 85%, rgba(212,160,23,0.03) 0%, transparent 60%);
    pointer-events: none;
  }

  .login-card {
    background: #141414;
    border: 1px solid #222;
    border-radius: 20px;
    padding: 2.5rem 2rem;
    width: 100%; max-width: 420px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 24px 64px rgba(0,0,0,0.6);
    z-index: 1;
  }
  .card-accent {
    position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, transparent, #c0392b, transparent);
  }

  /* Brand */
  .login-brand {
    display: flex; align-items: center; gap: 10px;
    justify-content: center;
    text-decoration: none;
    margin-bottom: 2rem;
  }
  .brand-text { display: flex; flex-direction: column; }
  .brand-name {
    font-family: 'Playfair Display', serif;
    font-size: 1.6rem; font-weight: 700;
    color: #fff; letter-spacing: 1px;
    line-height: 1;
  }
  .brand-sub {
    font-family: 'Sora', sans-serif;
    font-size: 0.68rem; letter-spacing: 0.3em;
    color: #666; text-transform: uppercase;
    margin-top: 2px;
  }

  .login-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.7rem; color: #fff;
    margin-bottom: 6px; text-align: center;
  }
  .login-sub {
    font-size: 0.85rem; color: #666;
    text-align: center; margin-bottom: 1.75rem;
  }

  /* Google button */
  .google-btn {
    width: 100%;
    display: flex; align-items: center; justify-content: center; gap: 10px;
    padding: 12px 16px;
    background: #fff;
    border: 1.5px solid #e0e0e0;
    border-radius: 10px;
    font-family: 'Sora', sans-serif;
    font-size: 0.9rem; font-weight: 600;
    color: #1a1a1a;
    cursor: pointer;
    transition: background 0.15s, box-shadow 0.15s, transform 0.12s;
    margin-bottom: 0;
  }
  .google-btn:hover {
    background: #f7f7f7;
    box-shadow: 0 2px 12px rgba(0,0,0,0.12);
    transform: translateY(-1px);
  }

  /* OR divider */
  .or-divider {
    display: flex; align-items: center; gap: 12px;
    margin: 1.2rem 0;
    color: #444;
    font-size: 0.75rem; letter-spacing: 0.08em;
  }
  .or-divider::before, .or-divider::after {
    content: ''; flex: 1;
    height: 1px; background: #2a2a2a;
  }
  .or-divider span { white-space: nowrap; }

  /* Mode toggle */
  .mode-toggle {
    display: flex; gap: 0;
    background: #0a0a0a;
    border: 1px solid #222;
    border-radius: 10px;
    padding: 3px;
    margin-bottom: 1.5rem;
  }
  .mode-btn {
    flex: 1; padding: 10px 8px;
    background: transparent;
    border: none; border-radius: 8px;
    font-family: 'Sora', sans-serif;
    font-size: 0.8rem; font-weight: 500;
    color: #666; cursor: pointer;
    transition: all 0.2s;
  }
  .mode-btn.active {
    background: #1e1e1e;
    color: #fff;
    font-weight: 600;
  }
  .mode-btn:hover:not(.active) { color: #999; }

  /* Form */
  .login-form { display: flex; flex-direction: column; gap: 0; }
  .field { margin-bottom: 1.1rem; }
  .field label {
    display: block; font-size: 0.72rem;
    color: #c0392b; letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 6px; font-weight: 600;
  }
  .field input {
    width: 100%; padding: 12px 14px;
    background: rgba(0,0,0,0.4);
    border: 1.5px solid #2a2a2a;
    border-radius: 10px; color: #fff;
    font-family: 'Sora', sans-serif;
    font-size: 1rem; outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .field input::placeholder { color: #444; }
  .field input:focus {
    border-color: #c0392b;
    box-shadow: 0 0 0 3px rgba(192,57,43,0.1);
  }

  /* Phone input */
  .phone-row {
    display: flex; align-items: stretch;
    background: rgba(0,0,0,0.4);
    border: 1.5px solid #2a2a2a;
    border-radius: 10px;
    overflow: hidden;
    transition: border-color 0.2s;
  }
  .phone-row:focus-within {
    border-color: #c0392b;
    box-shadow: 0 0 0 3px rgba(192,57,43,0.1);
  }
  .phone-prefix {
    display: flex; align-items: center;
    padding: 0 12px;
    background: rgba(255,255,255,0.03);
    border-right: 1px solid #2a2a2a;
    color: #888; font-size: 0.9rem;
    font-weight: 500;
  }
  .phone-row input {
    border: none; border-radius: 0;
    background: transparent;
    box-shadow: none !important;
  }
  .phone-row input:focus { box-shadow: none !important; }

  /* OTP */
  .otp-sent-msg {
    background: rgba(74,222,128,0.08);
    border: 1px solid rgba(74,222,128,0.2);
    border-radius: 8px; padding: 10px 14px;
    font-size: 0.82rem; color: #4ade80;
    margin-bottom: 1rem; text-align: center;
  }

  /* Error */
  .error-msg {
    background: rgba(180,40,40,0.12);
    border: 1px solid rgba(180,40,40,0.3);
    border-radius: 8px; padding: 10px 14px;
    font-size: 0.82rem; color: #ff8080;
    margin-bottom: 1rem;
  }

  /* Buttons */
  .login-btn {
    width: 100%; padding: 13px;
    border: none; border-radius: 10px;
    font-family: 'Sora', sans-serif;
    font-size: 0.95rem; font-weight: 700;
    cursor: pointer;
    transition: transform 0.15s, box-shadow 0.2s, opacity 0.2s;
    display: flex; align-items: center; justify-content: center; gap: 10px;
  }
  .login-btn:hover:not(:disabled) {
    transform: translateY(-1px);
  }
  .login-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .email-btn {
    background: #c0392b; color: #fff;
    box-shadow: 0 4px 16px rgba(192,57,43,0.25);
    margin-top: 4px;
  }
  .email-btn:hover:not(:disabled) {
    background: #e74c3c;
    box-shadow: 0 8px 24px rgba(192,57,43,0.35);
  }

  .whatsapp-btn {
    background: #25D366; color: #fff;
    box-shadow: 0 4px 16px rgba(37,211,102,0.2);
    margin-top: 4px;
  }
  .whatsapp-btn:hover:not(:disabled) {
    background: #2be873;
    box-shadow: 0 8px 24px rgba(37,211,102,0.3);
  }

  .resend-btn {
    width: 100%; padding: 10px;
    background: transparent;
    border: 1px solid #333;
    border-radius: 8px;
    color: #888; font-family: 'Sora', sans-serif;
    font-size: 0.82rem; cursor: pointer;
    margin-top: 10px;
    transition: border-color 0.2s, color 0.2s;
  }
  .resend-btn:hover { border-color: #c0392b; color: #c0392b; }

  /* Footer */
  .login-footer {
    text-align: center; margin-top: 1.75rem;
    font-size: 0.82rem; color: #555;
  }
  .login-footer a {
    color: #c0392b; text-decoration: none; font-weight: 500;
  }
  .login-footer a:hover { text-decoration: underline; }

  @media (max-width: 480px) {
    .login-card { padding: 2rem 1.5rem; }
    .login-title { font-size: 1.4rem; }
  }
`;

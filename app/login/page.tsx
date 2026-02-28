"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${location.origin}/auth/callback`,
        },
      });
      if (err) throw err;
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Outfit:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #0d1a0d;
          color: #e8ddd0;
          font-family: 'Outfit', sans-serif;
          min-height: 100vh;
        }

        .login-page {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
          position: relative;
        }

        /* Left panel — decorative */
        .login-left {
          background: linear-gradient(160deg, #000d00 0%, #0d1a0d 40%, #1a2e1a 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          position: relative;
          overflow: hidden;
          border-right: 1px solid rgba(201,150,58,0.12);
        }
        .login-left::before {
          content: '';
          position: absolute;
          top: -100px;
          left: -100px;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(201,150,58,0.07) 0%, transparent 70%);
          pointer-events: none;
        }
        .login-left::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 200px;
          background: linear-gradient(0deg, rgba(0,13,0,0.6) 0%, transparent 100%);
          pointer-events: none;
        }

        /* Decorative tribal pattern */
        .tribal-bg {
          position: absolute;
          inset: 0;
          opacity: 0.04;
          background-image: repeating-linear-gradient(
            45deg,
            #c9963a 0px,
            #c9963a 1px,
            transparent 1px,
            transparent 24px
          ), repeating-linear-gradient(
            -45deg,
            #c9963a 0px,
            #c9963a 1px,
            transparent 1px,
            transparent 24px
          );
        }

        .left-brand {
          position: relative;
          z-index: 1;
          text-align: center;
        }
        .brand-ornament {
          width: 60px;
          height: 2px;
          background: linear-gradient(90deg, transparent, #c9963a, transparent);
          margin: 0 auto 1.5rem;
        }
        .brand-logo {
          font-family: 'Playfair Display', serif;
          font-size: 2.4rem;
          color: #e8ddd0;
          margin-bottom: 0.3rem;
          letter-spacing: 0.02em;
          line-height: 1;
        }
        .brand-logo span { color: #c9963a; }
        .brand-tagline {
          font-size: 0.82rem;
          color: #8a9a8a;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 3rem;
        }
        .left-quote {
          font-family: 'Playfair Display', serif;
          font-style: italic;
          font-size: 1.25rem;
          color: rgba(232,221,208,0.7);
          line-height: 1.6;
          max-width: 320px;
          margin-bottom: 1rem;
        }
        .left-quote-attr {
          font-size: 0.8rem;
          color: #c9963a;
          letter-spacing: 0.05em;
        }

        /* Mountain silhouette SVG */
        .mountain-svg {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          opacity: 0.18;
        }

        /* Right panel — form */
        .login-right {
          background: #0d1a0d;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem 2rem;
        }
        .login-card {
          width: 100%;
          max-width: 400px;
        }
        .login-card h1 {
          font-family: 'Playfair Display', serif;
          font-size: 2rem;
          color: #e8ddd0;
          margin-bottom: 0.4rem;
        }
        .login-card h1 em {
          font-style: italic;
          color: #c9963a;
        }
        .login-subtitle {
          color: #8a9a8a;
          font-size: 0.9rem;
          margin-bottom: 2.5rem;
          line-height: 1.5;
        }

        .gold-divider {
          height: 1px;
          background: linear-gradient(90deg, #c9963a, rgba(201,150,58,0.2));
          margin-bottom: 2.5rem;
          width: 60px;
        }

        /* Success state */
        .success-box {
          background: rgba(201,150,58,0.08);
          border: 1px solid rgba(201,150,58,0.25);
          border-radius: 14px;
          padding: 2rem;
          text-align: center;
        }
        .success-icon {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          display: block;
        }
        .success-box h2 {
          font-family: 'Playfair Display', serif;
          color: #c9963a;
          font-size: 1.4rem;
          margin-bottom: 0.5rem;
        }
        .success-box p {
          color: #8a9a8a;
          font-size: 0.9rem;
          line-height: 1.6;
        }
        .success-box strong { color: #e8ddd0; }

        /* Form */
        .form-group {
          margin-bottom: 1.5rem;
        }
        .form-label {
          display: block;
          font-size: 0.78rem;
          color: #c9963a;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 0.5rem;
          font-weight: 600;
        }
        .form-input {
          width: 100%;
          padding: 0.85rem 1.1rem;
          background: rgba(255,255,255,0.03);
          border: 1.5px solid rgba(201,150,58,0.2);
          border-radius: 10px;
          color: #e8ddd0;
          font-family: 'Outfit', sans-serif;
          font-size: 0.98rem;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .form-input::placeholder { color: #3a4a3a; }
        .form-input:focus {
          border-color: #c9963a;
          box-shadow: 0 0 0 3px rgba(201,150,58,0.1);
        }

        .error-msg {
          background: rgba(180,40,40,0.12);
          border: 1px solid rgba(180,40,40,0.3);
          border-radius: 8px;
          padding: 0.7rem 1rem;
          font-size: 0.85rem;
          color: #ff8080;
          margin-bottom: 1rem;
        }

        .submit-btn {
          width: 100%;
          padding: 0.9rem;
          background: linear-gradient(135deg, #c9963a 0%, #a07020 100%);
          border: none;
          border-radius: 10px;
          color: #000d00;
          font-family: 'Outfit', sans-serif;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          letter-spacing: 0.05em;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          position: relative;
          overflow: hidden;
        }
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(201,150,58,0.35);
        }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .submit-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%);
          pointer-events: none;
        }

        .form-footer {
          margin-top: 1.5rem;
          text-align: center;
          font-size: 0.85rem;
          color: #8a9a8a;
        }
        .form-footer a {
          color: #c9963a;
          text-decoration: none;
        }
        .form-footer a:hover { text-decoration: underline; }

        .magic-link-note {
          margin-top: 1.25rem;
          padding: 0.75rem 1rem;
          background: rgba(255,255,255,0.02);
          border-radius: 8px;
          font-size: 0.8rem;
          color: #6a7a6a;
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          line-height: 1.5;
        }

        @media (max-width: 768px) {
          .login-page { grid-template-columns: 1fr; }
          .login-left { display: none; }
          .login-right { padding: 2rem 1.25rem; }
        }
      `}</style>

      <div className="login-page">
        {/* Decorative left panel */}
        <div className="login-left">
          <div className="tribal-bg" />
          <div className="left-brand">
            <div className="brand-ornament" />
            <div className="brand-logo">Discover<span>Nagaland</span></div>
            <div className="brand-tagline">The Land of Festivals</div>
            <p className="left-quote">
              &ldquo;Where ancient traditions meet the spirit of the mountains.&rdquo;
            </p>
            <p className="left-quote-attr">— Nagaland, Northeast India</p>
          </div>
          <svg className="mountain-svg" viewBox="0 0 800 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 200 L100 80 L200 140 L320 30 L440 120 L560 60 L680 130 L800 50 L800 200 Z" fill="#c9963a" />
          </svg>
        </div>

        {/* Right panel — form */}
        <div className="login-right">
          <div className="login-card">
            <h1>Welcome <em>back</em></h1>
            <p className="login-subtitle">
              Sign in with your email — we&apos;ll send you a magic link. No password needed.
            </p>
            <div className="gold-divider" />

            {sent ? (
              <div className="success-box">
                <span className="success-icon">✉️</span>
                <h2>Check your inbox</h2>
                <p>
                  We sent a magic link to <strong>{email}</strong>.<br />
                  Click it to sign in instantly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label" htmlFor="email">Email address</label>
                  <input
                    id="email"
                    className="form-input"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                {error && <div className="error-msg">{error}</div>}

                <button className="submit-btn" type="submit" disabled={loading}>
                  {loading ? "Sending…" : "Send Magic Link"}
                </button>

                <div className="magic-link-note">
                  <span>🔒</span>
                  <span>No password required. We&apos;ll email you a secure one-click sign in link.</span>
                </div>
              </form>
            )}

            <div className="form-footer">
              Don&apos;t have an account?{" "}
              <Link href="/register">Register your business →</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

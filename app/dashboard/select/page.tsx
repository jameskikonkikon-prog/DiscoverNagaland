'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

export default function DashboardSelectPage() {
  const router = useRouter()
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  )
  const [ready, setReady] = useState(false)

  useEffect(() => {
    async function resolve() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }

      const uid = session.user.id
      const [{ count: bc }, { count: pc }] = await Promise.all([
        supabase.from('businesses').select('id', { count: 'exact', head: true }).eq('owner_id', uid).eq('is_active', true),
        supabase.from('properties').select('id', { count: 'exact', head: true }).eq('owner_id', uid).eq('is_available', true),
      ])

      const hasBiz  = (bc ?? 0) > 0
      const hasProp = (pc ?? 0) > 0

      if      (hasBiz && hasProp)  setReady(true)           // show picker
      else if (hasBiz)             router.replace('/dashboard')
      else if (hasProp)            router.replace('/real-estate/dashboard')
      else                         router.replace('/account')
    }
    resolve()
  }, [supabase, router])

  if (!ready) {
    return (
      <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid #1e1e1e', borderTopColor: '#c0392b', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', fontFamily: "'Sora', sans-serif", color: '#fff' }}>
      <style>{`
        body { background: #0a0a0a; margin: 0; padding: 0; }
        body::before { content:''; position:fixed; inset:0; background:radial-gradient(ellipse 60% 50% at 20% 0%, rgba(139,0,0,0.07) 0%, transparent 60%); pointer-events:none; z-index:0; }
        .nav { position:sticky; top:0; z-index:50; background:rgba(10,10,10,0.92); backdrop-filter:blur(20px); border-bottom:1px solid rgba(255,255,255,0.07); padding:0 24px; height:58px; display:flex; align-items:center; }
        .nav-logo { font-size:14px; font-weight:700; color:#fff; text-decoration:none; }
        .nav-sep { color:rgba(255,255,255,0.38); font-size:12px; margin:0 8px; }
        .nav-tag { font-size:11.5px; font-weight:600; color:#c0392b; background:rgba(192,57,43,0.08); border:1px solid rgba(192,57,43,0.25); padding:3px 10px; border-radius:999px; }
        .wrap { position:relative; z-index:1; max-width:520px; margin:0 auto; padding:72px 24px 80px; }
        .eyebrow { display:inline-flex; align-items:center; gap:7px; font-size:10.5px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#c0392b; background:rgba(192,57,43,0.08); border:1px solid rgba(192,57,43,0.2); padding:5px 13px; border-radius:999px; margin-bottom:20px; }
        .title { font-size:clamp(22px,4vw,30px); font-weight:800; letter-spacing:-0.03em; margin-bottom:8px; }
        .sub { font-size:13.5px; color:rgba(255,255,255,0.38); margin-bottom:40px; line-height:1.6; }
        .options { display:grid; gap:14px; }
        .opt { display:flex; align-items:center; gap:18px; background:#111; border:1px solid rgba(255,255,255,0.07); border-radius:18px; padding:24px 22px; text-decoration:none; color:inherit; cursor:pointer; transition:border-color 0.15s, transform 0.12s; }
        .opt:hover { border-color:rgba(255,255,255,0.18); transform:translateY(-1px); }
        .opt-icon { width:52px; height:52px; border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:26px; flex-shrink:0; }
        .opt-icon.red { background:rgba(192,57,43,0.1); border:1px solid rgba(192,57,43,0.2); }
        .opt-icon.teal { background:rgba(59,168,143,0.08); border:1px solid rgba(59,168,143,0.18); }
        .opt-label { font-size:10px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; margin-bottom:4px; }
        .opt-label.red { color:#c0392b; }
        .opt-label.teal { color:#3ba88f; }
        .opt-title { font-size:17px; font-weight:700; letter-spacing:-0.02em; margin-bottom:4px; }
        .opt-desc { font-size:13px; color:rgba(255,255,255,0.38); line-height:1.5; }
        .opt-arrow { margin-left:auto; font-size:20px; color:rgba(255,255,255,0.2); flex-shrink:0; }
        @media(max-width:480px) { .wrap { padding:48px 16px 80px; } }
      `}</style>

      <nav className="nav">
        <a href="/" className="nav-logo">Yana Nagaland</a>
        <span className="nav-sep">/</span>
        <span className="nav-tag">Dashboard</span>
      </nav>

      <div className="wrap">
        <div className="eyebrow"><span>📊</span><span>Select Dashboard</span></div>
        <h1 className="title">Which dashboard?</h1>
        <p className="sub">You have listings in both directories. Choose which one to manage.</p>

        <div className="options">
          <a href="/dashboard" className="opt">
            <div className="opt-icon red">🏪</div>
            <div>
              <div className="opt-label red">Business Directory</div>
              <div className="opt-title">Business Dashboard</div>
              <div className="opt-desc">Manage listings, analytics, and AI search tools.</div>
            </div>
            <div className="opt-arrow">→</div>
          </a>

          <a href="/real-estate/dashboard" className="opt">
            <div className="opt-icon teal">🏡</div>
            <div>
              <div className="opt-label teal">Real Estate</div>
              <div className="opt-title">Property Dashboard</div>
              <div className="opt-desc">Manage your property listings across Nagaland.</div>
            </div>
            <div className="opt-arrow">→</div>
          </a>
        </div>
      </div>
    </div>
  )
}

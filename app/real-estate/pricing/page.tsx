'use client'

import { useState, useCallback, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void }
  }
}

type REPlan = 'starter' | 'pro' | 'agent'

const PLANS = [
  {
    key: 'starter' as REPlan,
    name: 'Starter',
    price: '₹499',
    paise: 49900,
    cycle: '/month',
    popular: false,
    features: [
      '1 active listing',
      '5 photos per listing',
      'Public visibility',
      'Call + WhatsApp buttons',
      'Edit anytime',
      'Lead tracking',
    ],
  },
  {
    key: 'pro' as REPlan,
    name: 'Pro',
    price: '₹799',
    paise: 79900,
    cycle: '/month',
    popular: true,
    features: [
      '5 active listings',
      '10 photos per listing',
      'Everything in Starter',
      'Featured badge',
      'Higher search ranking',
      'Monthly lead report',
    ],
  },
  {
    key: 'agent' as REPlan,
    name: 'Agent / Broker',
    price: '₹1,499',
    paise: 149900,
    cycle: '/month',
    popular: false,
    features: [
      'Unlimited listings',
      'Unlimited photos',
      'Everything in Pro',
      'Priority placement',
      '"Verified Agent" badge',
      'Detailed analytics',
    ],
  },
]

export default function RealEstatePricingPage() {
  const router = useRouter()
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  )
  const [buying, setBuying] = useState<REPlan | null>(null)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  // Redirect to login if not logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/login?redirect=/real-estate/pricing')
    })
  }, [supabase, router])

  const loadRazorpay = useCallback((): Promise<void> => {
    return new Promise(resolve => {
      if (typeof window !== 'undefined' && window.Razorpay) { resolve(); return }
      const existing = document.querySelector('script[src*="razorpay"]')
      if (existing) { existing.addEventListener('load', () => resolve()); return }
      const s = document.createElement('script')
      s.src = 'https://checkout.razorpay.com/v1/checkout.js'
      s.onload = () => resolve()
      document.head.appendChild(s)
    })
  }, [])

  const handleBuy = useCallback(async (plan: REPlan) => {
    setMsg(null)
    setBuying(plan)
    try {
      // 1. Create order
      const res = await fetch('/api/real-estate/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMsg({ text: data.error ?? 'Failed to initiate payment', ok: false })
        setBuying(null)
        return
      }

      // 2. Load Razorpay script
      await loadRazorpay()

      // 3. Open checkout
      const rzp = new window.Razorpay({
        key: data.key,
        amount: data.order.amount,
        currency: 'INR',
        order_id: data.order.id,
        name: 'Yana Nagaland',
        description: data.description,
        theme: { color: '#c0392b' },
        handler: async (response: Record<string, string>) => {
          setMsg({ text: 'Verifying payment…', ok: true })
          try {
            // 4. Verify
            const verifyRes = await fetch('/api/real-estate/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response),
            })
            const verifyData = await verifyRes.json()
            if (!verifyRes.ok) throw new Error(verifyData.error ?? 'Verification failed')

            // 5. Redirect to dashboard
            setMsg({ text: 'Payment successful! Redirecting…', ok: true })
            setTimeout(() => router.push('/real-estate/dashboard'), 1200)
          } catch (e) {
            setMsg({ text: e instanceof Error ? e.message : 'Verification failed. Contact support.', ok: false })
            setBuying(null)
          }
        },
        modal: { ondismiss: () => setBuying(null) },
      })
      rzp.open()
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : 'Something went wrong.', ok: false })
      setBuying(null)
    }
  }, [loadRazorpay, router])

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', fontFamily: "'Sora', sans-serif", color: '#f0f0f0' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; }
        .re-nav{position:sticky;top:0;z-index:50;background:rgba(10,10,10,0.92);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,0.07);padding:0 24px;height:58px;display:flex;align-items:center;justify-content:space-between;}
        .re-nav-left{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
        .re-nav-logo{font-size:14px;font-weight:700;color:#fff;text-decoration:none;}
        .re-nav-sep{color:rgba(255,255,255,0.25);font-size:12px;}
        .re-nav-crumb{font-size:13px;color:rgba(255,255,255,0.38);text-decoration:none;}
        .re-nav-crumb:hover{color:rgba(255,255,255,0.85);}
        .re-nav-tag{font-size:11.5px;font-weight:600;color:#c0392b;background:rgba(192,57,43,0.08);border:1px solid rgba(192,57,43,0.25);padding:3px 10px;border-radius:999px;}
        .re-nav-back{font-size:13px;color:rgba(255,255,255,0.38);text-decoration:none;}
        .re-nav-back:hover{color:rgba(255,255,255,0.85);}
        @media(max-width:700px){.re-plans-grid{grid-template-columns:1fr !important;}}
      `}</style>

      {/* NAV */}
      <nav className="re-nav">
        <div className="re-nav-left">
          <a href="/" className="re-nav-logo">Yana Nagaland</a>
          <span className="re-nav-sep">/</span>
          <a href="/real-estate" className="re-nav-crumb">Real Estate</a>
          <span className="re-nav-sep">/</span>
          <span className="re-nav-tag">Pricing</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/account" className="re-nav-back">👤 My Account</a>
          <a href="/real-estate/dashboard" className="re-nav-back">← Dashboard</a>
        </div>
      </nav>

      <main style={{ padding: '48px 24px 96px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c0392b', background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.2)', padding: '5px 14px', borderRadius: 999, marginBottom: 20 }}>
            Real Estate Plans
          </div>
          <h1 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 14 }}>
            List your property on Yana Nagaland
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', maxWidth: 480, margin: '0 auto 20px' }}>
            Reach buyers and renters across all 17 districts of Nagaland.
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(59,168,143,0.08)', border: '1px solid rgba(59,168,143,0.2)', borderRadius: 999, padding: '8px 18px', fontSize: 13, color: '#3ba88f', fontWeight: 600 }}>
            ✓ 7-day free trial for all plans. No credit card needed to start.
          </div>
        </div>

        {/* Status message */}
        {msg && (
          <div style={{ background: msg.ok ? 'rgba(59,168,143,0.1)' : 'rgba(192,57,43,0.1)', border: `1px solid ${msg.ok ? 'rgba(59,168,143,0.3)' : 'rgba(192,57,43,0.3)'}`, borderRadius: 12, padding: '12px 18px', fontSize: 13, color: msg.ok ? '#3ba88f' : '#e05a4a', marginBottom: 24, textAlign: 'center' }}>
            {msg.text}
          </div>
        )}

        {/* Plan cards */}
        <div className="re-plans-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 48 }}>
          {PLANS.map(plan => {
            const isBuying = buying === plan.key
            return (
              <div key={plan.key} style={{ background: plan.popular ? 'rgba(192,57,43,0.04)' : '#0f0f0f', border: plan.popular ? '1px solid rgba(192,57,43,0.35)' : '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '28px 24px', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                {plan.popular && (
                  <div style={{ position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)', background: '#c0392b', color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 14px', borderRadius: '0 0 8px 8px' }}>
                    Most Popular
                  </div>
                )}
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: plan.popular ? '#c0392b' : 'rgba(255,255,255,0.38)', marginBottom: 12 }}>
                  {plan.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                  <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.04em', color: '#fff' }}>{plan.price}</span>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)' }}>{plan.cycle}</span>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginBottom: 24 }}>First 7 days free</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ color: '#3ba88f', flexShrink: 0, marginTop: 1 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleBuy(plan.key)}
                  disabled={!!buying}
                  style={{ display: 'block', width: '100%', padding: '13px', borderRadius: 10, background: plan.popular ? '#c0392b' : 'transparent', border: plan.popular ? 'none' : '1px solid rgba(255,255,255,0.12)', color: plan.popular ? '#fff' : 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 700, cursor: buying ? 'not-allowed' : 'pointer', opacity: buying && !isBuying ? 0.4 : 1, fontFamily: "'Sora', sans-serif", transition: 'opacity 0.15s' }}
                >
                  {isBuying ? 'Processing…' : `Choose ${plan.name} →`}
                </button>
              </div>
            )
          })}
        </div>

        <div style={{ textAlign: 'center', background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '24px', fontSize: 13, color: 'rgba(255,255,255,0.38)', lineHeight: 1.7 }}>
          Questions? Contact us at{' '}
          <a href="mailto:support@yananagaland.com" style={{ color: '#c0392b', textDecoration: 'none', fontWeight: 600 }}>support@yananagaland.com</a>
        </div>

      </div>
      </main>
    </div>
  )
}

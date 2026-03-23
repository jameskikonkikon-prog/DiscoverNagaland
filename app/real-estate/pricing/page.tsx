import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Real Estate Pricing | Yana Nagaland' }

const PLANS = [
  {
    name: 'Starter',
    price: '₹499',
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
    name: 'Pro',
    price: '₹799',
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
    name: 'Agent / Broker',
    price: '₹1,499',
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
  return (
    <main style={{
      background: '#0a0a0a',
      minHeight: '100vh',
      fontFamily: "'Sora', sans-serif",
      color: '#f0f0f0',
      padding: '64px 24px 96px',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Back nav */}
        <Link href="/real-estate/dashboard" style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', textDecoration: 'none', display: 'inline-block', marginBottom: 36 }}>
          ← Back to Dashboard
        </Link>

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

        {/* Plan cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 48 }}>
          {PLANS.map(plan => (
            <div key={plan.name} style={{
              background: plan.popular ? 'rgba(192,57,43,0.04)' : '#0f0f0f',
              border: plan.popular ? '1px solid rgba(192,57,43,0.35)' : '1px solid rgba(255,255,255,0.07)',
              borderRadius: 16,
              padding: '28px 24px',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
            }}>
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
              <Link href="/contact" style={{
                display: 'block',
                textAlign: 'center',
                padding: '12px',
                borderRadius: 10,
                background: plan.popular ? '#c0392b' : 'transparent',
                border: plan.popular ? 'none' : '1px solid rgba(255,255,255,0.12)',
                color: plan.popular ? '#fff' : 'rgba(255,255,255,0.6)',
                fontSize: 13,
                fontWeight: 700,
                textDecoration: 'none',
                transition: 'opacity 0.15s',
              }}>
                Contact Us to Sign Up →
              </Link>
            </div>
          ))}
        </div>

        {/* Contact note */}
        <div style={{ textAlign: 'center', background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '24px', fontSize: 13, color: 'rgba(255,255,255,0.38)', lineHeight: 1.7 }}>
          Payments will be available online soon. For now, contact us to activate your plan.<br />
          <a href="mailto:support@yananagaland.com" style={{ color: '#c0392b', textDecoration: 'none', fontWeight: 600 }}>support@yananagaland.com</a>
        </div>

      </div>
    </main>
  )
}

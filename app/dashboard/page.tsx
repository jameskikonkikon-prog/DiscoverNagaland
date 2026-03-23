'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { PLANS } from '@/types'

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void }
  }
}

// ── TYPES ──────────────────────────────────────────────────────────────────
type Plan = 'basic' | 'pro' | 'plus'

interface Business {
  id: string
  name: string
  slug: string
  category: string
  city: string | null
  area: string | null
  phone: string | null
  whatsapp: string | null
  price_range: string | null
  opening_hours: string | null
  description: string | null
  photos: string[] | null
  plan: Plan
  plan_expires_at: string | null
  trial_ends_at: string | null
  is_verified: boolean
  verified: boolean
  featured: boolean
  claimed: boolean
  tags: string | null
  vibe_tags: string[] | null
  website: string | null
}

interface Analytics {
  views_today: number
  views_yesterday: number
  whatsapp_today: number
  whatsapp_yesterday: number
  calls_today: number
  calls_yesterday: number
  maps_today: number
  search_today: number
  total_views: number
  weekly_views: number[]
}

// ── HEALTH SCORE ──────────────────────────────────────────────────────────
function calcHealth(biz: Business | null) {
  if (!biz) return { score: 0, tips: [] as { text: string; done: boolean }[] }
  const checks = [
    { text: 'Add at least 2 photos',         done: (biz.photos?.length ?? 0) >= 2 },
    { text: 'Set your price range',           done: !!biz.price_range },
    { text: 'Add opening hours',              done: !!biz.opening_hours },
    { text: 'Add a description',              done: !!biz.description },
    { text: 'WhatsApp number added',          done: !!biz.whatsapp },
    { text: 'Add your website or social',     done: !!biz.website },
  ]
  const done = checks.filter(c => c.done).length
  return { score: Math.round((done / checks.length) * 100), tips: checks }
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  )
  const router = useRouter()

  const [userId,       setUserId]       = useState<string | null>(null)
  const [userEmail,    setUserEmail]    = useState<string>('')
  const [business,     setBusiness]     = useState<Business | null>(null)
  const [analytics,    setAnalytics]    = useState<Analytics | null>(null)
  const [foundingLeft, setFoundingLeft] = useState<number>(100)
  const [earlyAccessFull, setEarlyAccessFull] = useState<boolean>(false)
  const [activeTab,    setActiveTab]    = useState<'overview' | 'listing' | 'ai' | 'analytics' | 'billing'>('overview')
  const [loading,      setLoading]      = useState(true)
  const [upgrading,    setUpgrading]    = useState<string | null>(null)
  const [paymentMsg,   setPaymentMsg]   = useState<{ text: string; ok: boolean } | null>(null)
  const [leadCalls,    setLeadCalls]    = useState(0)
  const [leadWa,       setLeadWa]       = useState(0)
  const [leadViews,    setLeadViews]    = useState(0)
  const [leadMonth,    setLeadMonth]    = useState(0)

  // ── LOAD ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      setUserId(session.user.id)
      setUserEmail(session.user.email ?? '')

      // Business owned by this user
      const { data: biz } = await supabase
        .from('businesses')
        .select(`
          id, name, slug, category, city, area,
          phone, whatsapp, price_range, opening_hours,
          description, photos, plan, plan_expires_at,
          trial_ends_at, is_verified, verified, featured,
          claimed, tags, vibe_tags, website
        `)
        .eq('owner_id', session.user.id)
        .eq('is_active', true)
        .single()

      setBusiness(biz ?? null)

      // Analytics
      if (biz) {
        const today     = new Date().toISOString().split('T')[0]
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
        const weekStart = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0]

        const { data: rows } = await supabase
          .from('business_analytics')
          .select('date, profile_views, search_appearances, whatsapp_clicks, call_clicks, maps_clicks')
          .eq('business_id', biz.id)
          .gte('date', weekStart)
          .order('date', { ascending: true })

        const r = rows ?? []
        const get = (date: string, field: string) =>
          (r.find(x => x.date === date) as any)?.[field] ?? 0

        // Last 7 days for chart (oldest → newest)
        const weekly = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(Date.now() - (6 - i) * 86400000).toISOString().split('T')[0]
          return get(d, 'profile_views')
        })

        // All-time total views
        const { data: allRows } = await supabase
          .from('business_analytics')
          .select('profile_views')
          .eq('business_id', biz.id)
        const totalViews = (allRows ?? []).reduce((s, x) => s + (x.profile_views ?? 0), 0)

        setAnalytics({
          views_today:        get(today,     'profile_views'),
          views_yesterday:    get(yesterday, 'profile_views'),
          whatsapp_today:     get(today,     'whatsapp_clicks'),
          whatsapp_yesterday: get(yesterday, 'whatsapp_clicks'),
          calls_today:        get(today,     'call_clicks'),
          calls_yesterday:    get(yesterday, 'call_clicks'),
          maps_today:         get(today,     'maps_clicks'),
          search_today:       get(today,     'search_appearances'),
          total_views:        totalViews,
          weekly_views:       weekly,
        })

        // Lead events — all time
        const { data: leads } = await supabase
          .from('lead_events')
          .select('event_type, created_at')
          .eq('business_id', biz.id)
        const leadRows = leads ?? []
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
        setLeadCalls(leadRows.filter((l: { event_type: string }) => l.event_type === 'call').length)
        setLeadWa(leadRows.filter((l: { event_type: string }) => l.event_type === 'whatsapp').length)
        setLeadViews(leadRows.filter((l: { event_type: string }) => l.event_type === 'view').length)
        setLeadMonth(leadRows.filter((l: { event_type: string; created_at: string }) =>
          (l.event_type === 'call' || l.event_type === 'whatsapp') && l.created_at >= monthStart
        ).length)
      }

      // Early Access spots from API (live from Supabase)
      const spotsRes = await fetch('/api/founding-members')
      const spotsData = await spotsRes.json().catch(() => ({}))
      setFoundingLeft(Math.max(0, spotsData.remaining ?? spotsData.spotsRemaining ?? 100))
      setEarlyAccessFull(!!spotsData.isFull)

      setLoading(false)
    }
    load()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // ── PAYMENT ───────────────────────────────────────────────────────────────
  const ensureRazorpayScript = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && window.Razorpay) { resolve(); return }
      const existing = document.querySelector('script[src*="razorpay"]')
      if (existing) { existing.addEventListener('load', () => resolve()); return }
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve()
      document.head.appendChild(script)
    })
  }, [])

  const handleUpgrade = useCallback(async (targetPlan: 'pro' | 'plus') => {
    if (!business) return
    setUpgrading(targetPlan)
    setPaymentMsg(null)

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: business.id, plan: targetPlan }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPaymentMsg({ text: data.error || 'Failed to initiate payment', ok: false })
        setUpgrading(null)
        return
      }

      // Founding member — already upgraded on server, update local state
      if (data.foundingMember) {
        setBusiness(prev => prev ? { ...prev, plan: 'pro', plan_expires_at: null } : prev)
        setPaymentMsg({ text: `Founding member Pro activated! You're in the first ${100 - data.spotsRemaining}.`, ok: true })
        setUpgrading(null)
        return
      }

      // Regular payment via Razorpay
      await ensureRazorpayScript()
      const rzp = new window.Razorpay({
        key: data.key,
        amount: data.order.amount,
        currency: 'INR',
        order_id: data.order.id,
        name: 'Yana Nagaland',
        description: data.description || `${targetPlan.charAt(0).toUpperCase() + targetPlan.slice(1)} Plan`,
        theme: { color: '#c0392b' },
        handler: async (response: Record<string, string>) => {
          setPaymentMsg({ text: 'Verifying payment…', ok: true })
          try {
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...response, businessId: business.id, plan: targetPlan }),
            })
            const verifyData = await verifyRes.json()
            if (!verifyRes.ok) throw new Error(verifyData.error || 'Verification failed')
            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            setBusiness(prev => prev ? { ...prev, plan: targetPlan, plan_expires_at: expiresAt } : prev)
            setPaymentMsg({ text: `Upgraded to ${targetPlan.charAt(0).toUpperCase() + targetPlan.slice(1)}!`, ok: true })
          } catch (verifyErr) {
            setPaymentMsg({ text: verifyErr instanceof Error ? verifyErr.message : 'Verification failed. Contact support.', ok: false })
          }
          setUpgrading(null)
        },
        modal: { ondismiss: () => setUpgrading(null) },
      })
      rzp.open()
    } catch (err) {
      setPaymentMsg({ text: err instanceof Error ? err.message : 'Something went wrong.', ok: false })
      setUpgrading(null)
    }
  }, [business, ensureRazorpayScript])

  // ── HELPERS ───────────────────────────────────────────────────────────────
  const plan    = (business?.plan ?? 'basic') as 'basic' | 'pro' | 'plus'
  const isPro   = plan === 'pro' || plan === 'plus'
  const isPlus  = plan === 'plus'
  const health  = calcHealth(business)
  const maxPhotos = typeof PLANS[plan]?.maxPhotos === 'number' ? PLANS[plan].maxPhotos : (plan === 'plus' ? Infinity : plan === 'pro' ? 10 : 2)
  const canAddMorePhotos = (business?.photos?.length ?? 0) < maxPhotos

  const delta = (today: number, yesterday: number) => {
    if (today === 0 && yesterday === 0) return { label: 'No data yet',         color: 'var(--muted)' }
    if (yesterday === 0)                return { label: `+${today} today`,     color: 'var(--green)' }
    const pct = Math.round(((today - yesterday) / yesterday) * 100)
    if (pct === 0)  return { label: 'Same as yesterday',                        color: 'var(--muted)' }
    if (pct > 0)    return { label: `↑ ${pct}% from yesterday`,                color: 'var(--green)' }
    return            { label: `↓ ${Math.abs(pct)}% from yesterday`,           color: 'var(--red)' }
  }

  const weekMax  = Math.max(...(analytics?.weekly_views ?? [1]), 1)
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  // Derive first name from email if no display name
  const firstName = userEmail.split('@')[0] ?? 'there'

  const location = [business?.area, business?.city].filter(Boolean).join(', ')

  // ── LOADING ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#0a0a0a', fontFamily:'Sora,sans-serif' }}>
      <style>{`@keyframes skPulse{0%,100%{opacity:.22}50%{opacity:.5}}.sk{background:#1e1e1e;border-radius:10px;animation:skPulse 1.5s ease-in-out infinite}`}</style>
      <div style={{ width:220, background:'#111', borderRight:'1px solid rgba(255,255,255,0.06)', padding:24, display:'flex', flexDirection:'column', gap:14, flexShrink:0 }}>
        <div className="sk" style={{ height:30, width:110 }} />
        {[1,2,3,4,5].map(i => <div key={i} className="sk" style={{ height:18, width:'75%' }} />)}
      </div>
      <div style={{ flex:1, padding:'36px 40px', display:'flex', flexDirection:'column', gap:20 }}>
        <div className="sk" style={{ height:34, width:240 }} />
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
          {[1,2,3].map(i => <div key={i} className="sk" style={{ height:96, borderRadius:14 }} />)}
        </div>
        <div className="sk" style={{ height:180, borderRadius:14 }} />
        <div className="sk" style={{ height:120, borderRadius:14 }} />
      </div>
    </div>
  )

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{CSS}</style>
      <div className="layout">

        {/* ── SIDEBAR ─────────────────────────────────────────────────── */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <a href="/" className="sidebar-brand">
              <svg width="30" height="36" viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="dashPinG" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8B0000"/>
                    <stop offset="50%" stopColor="#c0392b"/>
                    <stop offset="100%" stopColor="#922B21"/>
                  </linearGradient>
                  <linearGradient id="dashFeathG" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#8B0000"/>
                    <stop offset="60%" stopColor="#c0392b"/>
                    <stop offset="100%" stopColor="#1a1a1a"/>
                  </linearGradient>
                  <radialGradient id="dashGlassG" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#1a1a1a"/>
                    <stop offset="100%" stopColor="#0d0d0d"/>
                  </radialGradient>
                </defs>
                <g transform="rotate(-35, 45, 30)">
                  <path d="M20 55 C10 40 15 15 40 0 C50 10 55 30 40 45 Z" fill="url(#dashFeathG)"/>
                  <line x1="20" y1="55" x2="38" y2="3" stroke="#1a1a1a" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
                  <circle cx="20" cy="55" r="3" fill="#D4A017"/>
                  <circle cx="20" cy="55" r="1.5" fill="#8B0000"/>
                </g>
                <path d="M60 18 C38 18 20 36 20 58 C20 82 60 120 60 120 C60 120 100 82 100 58 C100 36 82 18 60 18Z" fill="url(#dashPinG)"/>
                <path d="M42 35 L60 48 L78 35" stroke="rgba(0,0,0,0.3)" strokeWidth="2" fill="none" strokeLinejoin="round"/>
                <path d="M50 72 L60 62 L70 72 L60 82 Z" stroke="rgba(212,160,23,0.5)" strokeWidth="1" fill="rgba(0,0,0,0.15)"/>
                <path d="M47 88 L60 96 L73 88" stroke="rgba(212,160,23,0.3)" strokeWidth="1" fill="none"/>
                <path d="M60 18 C38 18 20 36 20 58 C20 82 60 120 60 120 C60 120 100 82 100 58 C100 36 82 18 60 18Z" fill="none" stroke="rgba(212,160,23,0.2)" strokeWidth="1"/>
                <circle cx="60" cy="58" r="19" fill="url(#dashGlassG)" stroke="white" strokeWidth="2.5"/>
                <circle cx="60" cy="58" r="15" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
                <path d="M54 52 L68 66" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M54 52 L54 60 L62 52 Z" fill="white"/>
                <line x1="74" y1="72" x2="84" y2="82" stroke="white" strokeWidth="4" strokeLinecap="round"/>
                <circle cx="85" cy="83" r="2" fill="rgba(212,160,23,0.6)"/>
              </svg>
              <div className="sidebar-wordmark">
                <div className="sidebar-wordmark-main">Yana</div>
                <div className="sidebar-wordmark-sub">Nagaland</div>
              </div>
            </a>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-label">Dashboard</div>
            {([
              { key:'overview',   icon:'📊', label:'Overview'    },
              { key:'listing',    icon:'🏪', label:'My Listing'  },
              { key:'ai',         icon:'🤖', label:'AI Tools'    },
              { key:'analytics',  icon:'📈', label:'Analytics'   },
            ] as const).map(item => (
              <button key={item.key}
                className={`nav-item${activeTab === item.key ? ' active' : ''}`}
                onClick={() => setActiveTab(item.key)}>
                <span className="icon">{item.icon}</span>{item.label}
              </button>
            ))}

            <div className="nav-label">Settings</div>
            <button
              className={`nav-item${activeTab === 'billing' ? ' active' : ''}`}
              onClick={() => setActiveTab('billing')}>
              <span className="icon">💳</span>Plan & Billing
            </button>
          </nav>

          <div className="sidebar-bottom">
            <div className="plan-pill">
              <span className={`badge badge-${plan}`}>{plan}</span>
              <div className="plan-info">
                <div className="plan-name">
                  {plan === 'basic' ? 'Free Plan' : plan === 'pro' ? 'Pro Plan' : 'Plus Plan'}
                </div>
                <div className="plan-sub">
                  {plan === 'basic'
                    ? 'Upgrade for more'
                    : plan === 'pro'
                    ? `Expires ${business?.plan_expires_at ? new Date(business.plan_expires_at).toLocaleDateString() : '—'}`
                    : 'All features unlocked'}
                </div>
              </div>
            </div>
            <a href="/account" className="nav-item" style={{textDecoration:'none',display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
              <span className="icon">👤</span>My Account
            </a>
            <button className="nav-item sign-out" onClick={signOut}>
              <span className="icon">🚪</span>Sign Out
            </button>
          </div>
        </aside>

        {/* ── MAIN ────────────────────────────────────────────────────── */}
        <main className="main">

          {/* TOPBAR */}
          <div className="topbar">
            <div className="topbar-left">
              <h1>{greeting()}, {firstName} 👋</h1>
              <p>Here's how your business is doing today</p>
            </div>
            {business && (
              <a href={`/business/${business.slug}`} target="_blank" rel="noreferrer" className="view-btn">
                🔗 View Live Listing
              </a>
            )}
          </div>

          {/* ════════════════════════════════════════════════════════════
              OVERVIEW TAB
          ════════════════════════════════════════════════════════════ */}
          {activeTab === 'overview' && <>

            {/* UPGRADE HOOK — basic only */}
            {plan === 'basic' && (
              <div className="upgrade-hook" onClick={() => setActiveTab('billing')}>
                <div className="hook-left">
                  <span className="hook-emoji">🚀</span>
                  <div>
                    <div className="hook-title">You're invisible to half your customers</div>
                    <div className="hook-sub">
                      Pro businesses rank <span>4x higher</span> in search.{' '}
                      {earlyAccessFull ? <span>Pro now ₹299/month</span> : <span>Only {foundingLeft} Early Access spots left — Get Pro free for your first month</span>}
                    </div>
                  </div>
                </div>
                <div className="hook-stats">
                  <div className="hook-stat"><div className="val">4x</div><div className="lbl">More clicks</div></div>
                  <div className="hook-stat"><div className="val">{earlyAccessFull ? '₹299' : 'Free'}</div><div className="lbl">Right now</div></div>
                </div>
                <button className="red-btn">See Plans →</button>
              </div>
            )}

            {/* FOUNDING BANNER — pro */}
            {plan === 'pro' && (
              <div className="banner green-banner">
                <span>🎖️</span>
                <div>
                  <div className="banner-title">Founding Member</div>
                  <div className="banner-sub">You're one of the first 100 businesses on Yana Nagaland.</div>
                </div>
              </div>
            )}

            {/* PLUS BANNER */}
            {isPlus && (
              <div className="banner gold-banner">
                <span>⭐</span>
                <div>
                  <div className="banner-title">Plus — Gold Verified</div>
                  <div className="banner-sub">Your listing appears first in every search result.</div>
                </div>
              </div>
            )}

            {/* STATS ROW */}
            {isPro ? (
              <div className="stats-row">
                <div className="stat-card">
                  <div className="stat-icon">📞</div>
                  <div className="stat-label">Total Calls</div>
                  <div className="stat-value">{leadCalls.toLocaleString()}</div>
                  <div className="stat-change" style={{ color: 'var(--muted)' }}>All time</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">💬</div>
                  <div className="stat-label">WhatsApp Clicks</div>
                  <div className="stat-value">{leadWa.toLocaleString()}</div>
                  <div className="stat-change" style={{ color: 'var(--muted)' }}>All time</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">📊</div>
                  <div className="stat-label">Leads This Month</div>
                  <div className="stat-value">{leadMonth.toLocaleString()}</div>
                  <div className="stat-change" style={{ color: 'var(--muted)' }}>Calls + WhatsApp</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">👁️</div>
                  <div className="stat-label">Listing Views</div>
                  <div className="stat-value">{leadViews.toLocaleString()}</div>
                  <div className="stat-change" style={{ color: 'var(--muted)' }}>All time</div>
                </div>
              </div>
            ) : (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', marginBottom: 24, fontSize: 13, color: 'var(--muted)', cursor: 'pointer' }} onClick={() => setActiveTab('billing')}>
                🔒 <strong style={{ color: 'var(--text)' }}>Upgrade to Pro</strong> to see who&apos;s contacting you — calls, WhatsApp clicks, and listing views.
              </div>
            )}

            {/* TWO COL */}
            <div className="two-col">

              {/* LISTING HEALTH */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">Listing Health</div>
                    <div className="card-sub">Complete your profile to rank higher</div>
                  </div>
                  <button className="card-action" onClick={() => setActiveTab('listing')}>Fix Now →</button>
                </div>
                <div className="health-wrap">
                  <div className="health-ring">
                    <svg width="80" height="80" viewBox="0 0 80 80">
                      <circle className="ring-bg" cx="40" cy="40" r="30"/>
                      <circle className="ring-fg" cx="40" cy="40" r="30"
                        style={{ strokeDashoffset: 188 - (188 * health.score) / 100 }}/>
                    </svg>
                    <div className="health-center">
                      <div className="health-pct">{health.score}%</div>
                      <div className="health-lbl">Complete</div>
                    </div>
                  </div>
                  <div className="health-tips">
                    <h4>Fix these to get more customers:</h4>
                    {health.tips.map((tip, i) => (
                      <div key={i} className="tip-row" style={tip.done ? { color:'#27ae60' } : {}}>
                        <div className="tip-dot" style={tip.done ? { background:'#27ae60' } : {}}/>
                        {tip.text}{tip.done ? ' ✓' : ''}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI TOOLS */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">AI Tools</div>
                    <div className="card-sub">Let AI grow your business</div>
                  </div>
                </div>
                <div className="ai-grid">
                  {[
                    { icon:'✍️', name:'Write Description', desc: isPro ? 'Unlimited' : 'One free use',  locked: false, badge: null as string | null },
                    { icon:'📈', name:'Growth Advisor',    desc: isPro ? 'Weekly' : 'One free use',     locked: false, badge: null },
                    { icon:'💬', name:'Review Analyser',   desc:'Analyse your customer reviews',        locked: !isPro,  badge: 'Pro' },
                    { icon:'📱', name:'Social Media Helper', desc:'Generate captions in one click',     locked: !isPro,  badge: 'Pro' },
                    { icon:'📋', name:'Menu / Catalogue QR',       desc:'Format your menu with AI',             locked: !isPro,  badge: 'Pro' },
                    { icon:'🔍', name:'Competitor Intel',  desc:'Beat the competition',                 locked: !isPlus, badge: 'Plus' },
                  ].map((tool, i) => (
                    <div key={i} className={`ai-tool${tool.locked ? ' locked' : ''}`}
                      onClick={() => !tool.locked && setActiveTab('ai')}>
                      <span className="ai-icon">{tool.icon}</span>
                      <div>
                        <div className="ai-name">{tool.name}</div>
                        <div className="ai-desc">{tool.desc}</div>
                      </div>
                      {tool.locked && <span className="lock-badge">🔒 Upgrade</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* LISTING PREVIEW */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">Your Listing</div>
                    <div className="card-sub">What customers see</div>
                  </div>
                  <button className="card-action" onClick={() => setActiveTab('listing')}>Edit →</button>
                </div>
                {business ? (
                  <div className="listing-preview">
                    <div className="biz-name">
                      {business.name}
                      {isPlus && (
                        <span className="verified-badge gold">⭐ Verified</span>
                      )}
                    </div>
                    <div className="biz-cat">{business.category}{location ? ` · ${location}` : ''}</div>
                    <div className="listing-fields">
                      {[
                        { label:'Phone',       value: business.phone },
                        { label:'WhatsApp',    value: business.whatsapp },
                        { label:'Price',       value: business.price_range },
                        { label:'Hours',       value: business.opening_hours },
                        { label:'Photos',      value: business.photos?.length ? `${business.photos.length} / ${maxPhotos === Infinity ? '∞' : maxPhotos}` : `0 / ${maxPhotos === Infinity ? '∞' : maxPhotos}` },
                        { label:'Description', value: business.description ? business.description.slice(0,48)+'…' : null },
                      ].map((f, i) => (
                        <div key={i} className="lf-row">
                          <span className="lf-label">{f.label}</span>
                          <span className={`lf-value${!f.value ? ' missing' : ''}`}>{f.value ?? 'Not added'}</span>
                        </div>
                      ))}
                    </div>
                    <button className="edit-btn" onClick={() => setActiveTab('listing')}>✏️ Edit Full Listing</button>
                  </div>
                ) : (
                  <div className="empty-state">
                    <div style={{ fontSize:32 }}>🏪</div>
                    <div>No listing yet</div>
                    <a href="/dashboard/add-listing" className="red-btn" style={{ textDecoration:'none', display:'inline-block', marginTop:12, padding:'8px 18px', fontSize:13 }}>
                      + Add Your Business
                    </a>
                  </div>
                )}
              </div>

              {/* WEEKLY ANALYTICS */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">Weekly Analytics</div>
                    <div className="card-sub">Profile views this week</div>
                  </div>
                </div>
                <div className={isPro ? '' : 'locked-wrap'}>
                  <div className="chart">
                    {(analytics?.weekly_views ?? Array(7).fill(0)).map((v, i) => (
                      <div key={i} className={`bar${i===6?' today':''}`}
                        style={{ height:`${Math.max(6, (v / weekMax) * 100)}%` }}
                        title={`${weekDays[i]}: ${v} views`}/>
                    ))}
                  </div>
                  <div className="chart-labels">
                    {weekDays.map(d => <div key={d} className="chart-label">{d}</div>)}
                  </div>
                </div>
                {!isPro && (
                  <button className="red-btn" style={{ marginTop:14, width:'100%', padding:'10px' }}
                    onClick={() => setActiveTab('billing')}>
                    Unlock Analytics →
                  </button>
                )}
              </div>

            </div>
          </>}

          {/* ════════════════════════════════════════════════════════════
              LISTING TAB
          ════════════════════════════════════════════════════════════ */}
          {activeTab === 'listing' && (
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">My Listing</div>
                  <div className="card-sub">Your full business profile</div>
                </div>
                {business && (
                  <a href="/dashboard/settings" className="red-btn"
                    style={{ textDecoration:'none', padding:'8px 16px', fontSize:13 }}>
                    ✏️ Edit Listing
                  </a>
                )}
              </div>
              {business ? (
                <>
                  <div style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>{business.name}</div>
                  <div style={{ color:'var(--muted)', fontSize:13, marginBottom:20 }}>
                    {business.category}{location ? ` · ${location}` : ''}
                  </div>
                  <div className="listing-fields" style={{ maxWidth:520 }}>
                    {[
                      { label:'Phone',         value: business.phone },
                      { label:'WhatsApp',       value: business.whatsapp },
                      { label:'Email',          value: (business as any).email },
                      { label:'Price Range',    value: business.price_range },
                      { label:'Opening Hours',  value: business.opening_hours },
                      { label:'Website',        value: business.website },
                      { label:'Photos',         value: business.photos?.length ? `${business.photos.length} photo(s)` : null },
                      { label:'Description',    value: business.description },
                      { label:'Tags',           value: business.tags },
                      { label:'Vibe Tags',      value: business.vibe_tags?.join(', ') || null },
                    ].map((f, i) => (
                      <div key={i} className="lf-row" style={{ padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                        <span className="lf-label">{f.label}</span>
                        <span className={`lf-value${!f.value ? ' missing' : ''}`}>{f.value ?? 'Not added'}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <div style={{ fontSize:48 }}>🏪</div>
                  <p style={{ fontSize:14, margin:'8px 0 16px' }}>You haven't added a business yet</p>
                  <a href="/dashboard/add-listing" className="red-btn"
                    style={{ textDecoration:'none', display:'inline-block', padding:'10px 24px' }}>
                    + Add Your Business
                  </a>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              AI TOOLS TAB
          ════════════════════════════════════════════════════════════ */}
          {activeTab === 'ai' && (
            <>
              <div className="card" style={{ marginBottom:16 }}>
                <div className="card-header">
                  <div>
                    <div className="card-title">AI Tools</div>
                    <div className="card-sub">Powered by Claude</div>
                  </div>
                </div>
                <div className="ai-grid">
                  {[
                    { icon:'✍️', name:'Write Description',  desc:'AI writes your business description',                                        locked:false,   href:'/dashboard/ai-tools/write-description' },
                    { icon:'📈', name:'Growth Advisor',      desc:'5 personalised tips for your business',                                      locked:false,   href:'/dashboard/ai-tools/growth-advisor' },
                    { icon:'💬', name:'Review Analyser',     desc:'AI reads your reviews and tells you what to improve',                        locked:!isPro,  href:'/dashboard/ai-tools/review-analyser' },
                    { icon:'📱', name:'Social Media Helper', desc:'Generate captions for Instagram, Facebook & WhatsApp',                      locked:!isPro,  href:'/dashboard/ai-tools/social-media' },
                    { icon:'🔍', name:'Competitor Intel',    desc:'Understand your competition in Nagaland',                                    locked:!isPlus, href:'/dashboard/ai-tools/competitor-intel' },
                    { icon:'📋', name:'Menu / Catalogue QR',         desc:'AI reads your menu and generates a QR code',                                locked:!isPlus, href:'/dashboard/ai-tools/menu-reader' },
                  ].map((tool, i) =>
                    tool.locked ? (
                      <div key={i} className="ai-tool locked">
                        <span className="ai-icon">{tool.icon}</span>
                        <div>
                          <div className="ai-name">{tool.name}</div>
                          <div className="ai-desc">{tool.desc}</div>
                        </div>
                        <span className="lock-badge">🔒 Upgrade</span>
                      </div>
                    ) : (
                      <a key={i} href={tool.href} className="ai-tool" style={{ textDecoration:'none' }}>
                        <span className="ai-icon">{tool.icon}</span>
                        <div>
                          <div className="ai-name">{tool.name}</div>
                          <div className="ai-desc">{tool.desc}</div>
                        </div>
                      </a>
                    )
                  )}
                </div>
              </div>
              {!isPro && (
                <div className="upgrade-hook" onClick={() => setActiveTab('billing')}>
                  <div className="hook-left">
                    <span className="hook-emoji">🤖</span>
                    <div>
                      <div className="hook-title">Unlock all AI tools</div>
                      <div className="hook-sub">Pro gives unlimited AI. {earlyAccessFull ? <span>Pro now ₹299/month</span> : <span>Only {foundingLeft} Early Access spots left.</span>}</div>
                    </div>
                  </div>
                  <button className="red-btn">{earlyAccessFull ? 'Upgrade →' : 'Upgrade Free →'}</button>
                </div>
              )}
            </>
          )}

          {/* ════════════════════════════════════════════════════════════
              ANALYTICS TAB
          ════════════════════════════════════════════════════════════ */}
          {activeTab === 'analytics' && (
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Analytics</div>
                  <div className="card-sub">Views, clicks &amp; engagement</div>
                </div>
              </div>
              {isPro ? (
                <>
                  <div className="stats-row" style={{ marginBottom:24 }}>
                    {[
                      { icon:'👁️', label:'Views today',       value: analytics?.views_today ?? 0 },
                      { icon:'💬', label:'WhatsApp clicks',   value: analytics?.whatsapp_today ?? 0 },
                      { icon:'📞', label:'Call clicks',       value: analytics?.calls_today ?? 0 },
                      { icon:'🗺️', label:'Maps clicks',       value: analytics?.maps_today ?? 0 },
                      { icon:'🔍', label:'Search appearances',value: analytics?.search_today ?? 0 },
                      { icon:'📅', label:'Total views',       value: analytics?.total_views ?? 0 },
                    ].map((s, i) => (
                      <div key={i} className="stat-card">
                        <div className="stat-icon">{s.icon}</div>
                        <div className="stat-label">{s.label}</div>
                        <div className="stat-value">{s.value.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize:13, fontWeight:600, marginBottom:10 }}>Profile Views — Last 7 Days</div>
                  <div className="chart" style={{ height:160 }}>
                    {(analytics?.weekly_views ?? Array(7).fill(0)).map((v, i) => (
                      <div key={i} className={`bar${i===6?' today':''}`}
                        style={{ height:`${Math.max(6, (v / weekMax) * 100)}%`, position:'relative' }}
                        title={`${weekDays[i]}: ${v} views`}>
                        <span style={{ position:'absolute', top:-18, left:'50%', transform:'translateX(-50%)', fontSize:9, color:'var(--muted)', whiteSpace:'nowrap' }}>
                          {v}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="chart-labels">
                    {weekDays.map(d => <div key={d} className="chart-label">{d}</div>)}
                  </div>
                </>
              ) : (
                <div className="empty-state" style={{ padding:'48px 0' }}>
                  <div style={{ fontSize:40 }}>🔒</div>
                  <div style={{ fontSize:15, fontWeight:700, margin:'10px 0 6px' }}>Analytics is a Pro feature</div>
                  <div style={{ fontSize:13, color:'var(--muted)', marginBottom:20 }}>
                    {earlyAccessFull ? 'Pro now ₹299/month' : `Only ${foundingLeft} Early Access spots left — Get Pro free for your first month`}
                  </div>
                  <button className="red-btn" onClick={() => setActiveTab('billing')}>{earlyAccessFull ? 'Upgrade →' : 'Upgrade Free →'}</button>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              BILLING TAB
          ════════════════════════════════════════════════════════════ */}
          {activeTab === 'billing' && (
            <>
              <div style={{ fontSize:18, fontWeight:800, marginBottom:4 }}>Plan &amp; Billing</div>
              <div style={{ fontSize:13, color:'var(--muted)', marginBottom:24 }}>
                You're on the{' '}
                <strong style={{ color: isPlus ? 'var(--gold)' : isPro ? 'var(--red)' : '#888' }}>
                  {plan.toUpperCase()}
                </strong>{' '}
                plan
                {business?.plan_expires_at && !isPlus
                  ? ` · expires ${new Date(business.plan_expires_at).toLocaleDateString()}`
                  : ''}
              </div>
              {paymentMsg && (
                <div style={{
                  background: paymentMsg.ok ? 'rgba(39,174,96,0.1)' : 'rgba(192,57,43,0.1)',
                  border: `1px solid ${paymentMsg.ok ? 'rgba(39,174,96,0.3)' : 'rgba(192,57,43,0.3)'}`,
                  borderRadius:10, padding:'12px 16px', marginBottom:20,
                  fontSize:13, color: paymentMsg.ok ? 'var(--green)' : 'var(--red)', fontWeight:600,
                }}>
                  {paymentMsg.ok ? '✓ ' : '✗ '}{paymentMsg.text}
                </div>
              )}
              <div className="plan-grid">
                {([
                  {
                    key: 'basic',
                    name: 'Basic',
                    price: 'Free',
                    sub: 'Forever',
                    border: '1px solid var(--border)',
                    features: ['Full listing', '2 photos', 'WhatsApp & Call', 'Your own stats', 'AI description once', 'AI growth advisor once'],
                  },
                  {
                    key: 'pro',
                    name: 'Pro',
                    price: earlyAccessFull ? '₹299' : (foundingLeft > 0 ? 'Free*' : '₹299'),
                    sub: earlyAccessFull ? '/month' : (foundingLeft > 0 ? 'founding members' : '/month'),
                    border: '1px solid var(--red)',
                    popular: true,
                    features: ['Everything in Basic', '10 photos', 'Higher search ranking', 'Weekly analytics', 'AI description unlimited', 'AI menu / catalogue QR', 'AI growth advisor weekly', 'WhatsApp booking button'],
                  },
                  {
                    key: 'plus',
                    name: 'Plus',
                    price: '₹499',
                    sub: '/month',
                    border: '1px solid var(--gold)',
                    features: ['Everything in Pro', 'Unlimited photos', 'Always first in search', 'Gold verified badge', 'Featured on homepage weekly', 'AI competitor intel', 'AI full business report', 'Weekly WhatsApp analytics', 'Festival promotion banner'],
                  },
                ] as const).map(p => (
                  <div key={p.key} className="card" style={{ border: p.key === 'pro' ? '1px solid var(--red)' : p.key === 'plus' ? '1px solid var(--gold)' : '1px solid var(--border)', background: plan === p.key ? 'var(--surface2)' : undefined }}>
                    {p.popular && <div style={{ fontSize:10, fontWeight:800, letterSpacing:1, color: 'var(--red)', marginBottom:8 }}>MOST POPULAR</div>}
                    <div style={{ fontSize:18, fontWeight:800, marginBottom:4 }}>{p.name}</div>
                    <div style={{ fontSize:26, fontWeight:800, marginBottom:6, color: p.key === 'basic' ? '#888' : p.key === 'pro' ? 'var(--red)' : 'var(--gold)' }}>
                      {p.price} <span style={{ fontSize:12, fontWeight:400, color: 'var(--muted)' }}>{p.sub}</span>
                    </div>
                    {p.key === 'pro' && !earlyAccessFull && (
                      <div style={{ marginBottom:12, fontSize:11, color: foundingLeft < 20 ? 'var(--red)' : 'var(--muted)', fontWeight:600 }}>
                        🔥 Only {foundingLeft} Early Access spots left — Get Pro free for your first month
                      </div>
                    )}
                    {p.key === 'pro' && earlyAccessFull && (
                      <div style={{ marginBottom:12, fontSize:11, color: 'var(--muted)', fontWeight:600 }}>
                        Early Access full — Pro now ₹299/month
                      </div>
                    )}
                    <div style={{ borderBottom: '1px solid var(--border)', marginBottom: 12 }} />
                    {p.features.map((f, i) => (
                      <div key={i} style={{ fontSize: 12, color: '#ccc', marginBottom: 6 }}>✓ {f}</div>
                    ))}
                    <div style={{ marginTop: 16 }}>
                      {plan === p.key ? (
                        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--green)', fontWeight: 700 }}>✓ Current Plan</div>
                      ) : p.key === 'basic' ? (
                        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>—</div>
                      ) : (
                        <button
                          className="red-btn"
                          style={{ width: '100%', padding: '10px', fontSize: 13 }}
                          onClick={() => handleUpgrade(p.key as 'pro' | 'plus')}
                          disabled={!!upgrading}
                        >
                          {upgrading === p.key ? 'Processing…' : (p.key === 'pro' && foundingLeft > 0 && !earlyAccessFull ? 'Claim Free Pro →' : 'Upgrade →')}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

        </main>
      </div>
    </>
  )
}

// ── CSS ────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');
*{margin:0;padding:0;box-sizing:border-box;}
:root{
  --bg:#0a0a0a;--surface:#111111;--surface2:#171717;--surface3:#1e1e1e;
  --border:#222222;--red:#c0392b;--red-soft:rgba(192,57,43,0.12);
  --gold:#D4A017;--gold-soft:rgba(212,160,23,0.12);
  --green:#27ae60;--text:#ffffff;--muted:#666;--muted2:#333;
}
body{font-family:'Sora',sans-serif;background:var(--bg);color:var(--text);}
.layout{display:flex;min-height:100vh;}

/* SIDEBAR */
.sidebar{width:220px;background:var(--surface);border-right:1px solid var(--border);padding:24px 0;flex-shrink:0;display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;overflow-y:auto;}
.sidebar-logo{padding:0 20px 24px;border-bottom:1px solid var(--border);}
.sidebar-brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:inherit;}
.sidebar-wordmark{display:flex;flex-direction:column;}
.sidebar-wordmark-main{font-family:'Playfair Display',serif;font-size:16px;color:#fff;letter-spacing:1px;line-height:1;}
.sidebar-wordmark-sub{font-size:9px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.35);margin-top:2px;}
.sidebar-nav{padding:16px 12px;flex:1;display:flex;flex-direction:column;gap:4px;}
.nav-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted2);padding:12px 12px 6px;}
.nav-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;font-size:13px;font-weight:500;color:var(--muted);cursor:pointer;transition:all 0.2s;text-decoration:none;font-family:'Sora',sans-serif;border:none;background:none;width:100%;}
.nav-item:hover{background:var(--surface2);color:#ccc;}
.nav-item.active{background:var(--red-soft);color:var(--red);font-weight:600;}
.nav-item .icon{font-size:16px;width:20px;text-align:center;}
.sign-out{color:var(--muted);}
.sidebar-bottom{padding:16px 12px;border-top:1px solid var(--border);}
.plan-pill{display:flex;align-items:center;gap:8px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin-bottom:8px;}
.badge{font-size:10px;font-weight:800;padding:3px 8px;border-radius:6px;text-transform:uppercase;letter-spacing:0.5px;}
.badge-basic{background:#333;color:#888;}
.badge-pro{background:var(--red-soft);color:var(--red);border:1px solid rgba(192,57,43,0.3);}
.badge-plus{background:var(--gold-soft);color:var(--gold);border:1px solid rgba(212,160,23,0.3);}
.plan-info{flex:1;}
.plan-name{font-size:12px;font-weight:600;}
.plan-sub{font-size:10px;color:var(--muted);}

/* MAIN */
.main{margin-left:220px;flex:1;padding:28px;max-width:calc(100vw - 220px);}
.topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;}
.topbar-left h1{font-size:20px;font-weight:700;}
.topbar-left p{font-size:13px;color:var(--muted);margin-top:2px;}
.view-btn{display:flex;align-items:center;gap:6px;background:var(--surface2);border:1px solid var(--border);color:#ccc;padding:8px 14px;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;transition:all 0.2s;font-family:'Sora',sans-serif;text-decoration:none;}
.view-btn:hover{border-color:#444;color:#fff;}

/* BANNERS */
.upgrade-hook{background:linear-gradient(135deg,#150808,#111);border:1px solid #2a1212;border-left:3px solid var(--red);border-radius:14px;padding:18px 22px;display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:24px;cursor:pointer;transition:all 0.2s;}
.upgrade-hook:hover{box-shadow:0 4px 24px rgba(192,57,43,0.1);}
.hook-left{display:flex;align-items:center;gap:14px;flex:1;}
.hook-emoji{font-size:24px;}
.hook-title{font-size:14px;font-weight:700;margin-bottom:3px;}
.hook-sub{font-size:12px;color:var(--muted);}
.hook-sub span{color:var(--red);font-weight:600;}
.hook-stats{display:flex;gap:20px;}
.hook-stat{text-align:center;}
.hook-stat .val{font-size:18px;font-weight:800;color:var(--red);}
.hook-stat .lbl{font-size:10px;color:var(--muted);text-transform:uppercase;}
.banner{border-radius:14px;padding:16px 20px;display:flex;align-items:center;gap:14px;margin-bottom:24px;font-size:20px;}
.green-banner{background:linear-gradient(135deg,#0d1a0d,#111);border:1px solid rgba(39,174,96,0.3);border-left:3px solid var(--green);}
.gold-banner{background:linear-gradient(135deg,#1a1500,#111);border:1px solid rgba(212,160,23,0.3);border-left:3px solid var(--gold);}
.banner-title{font-size:14px;font-weight:700;margin-bottom:2px;}
.banner-sub{font-size:12px;color:var(--muted);}

/* STATS */
.stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px;}
.stat-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px;transition:all 0.2s;}
.stat-card:hover{border-color:#333;transform:translateY(-1px);}
.stat-icon{font-size:20px;margin-bottom:10px;}
.stat-label{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;}
.stat-value{font-size:28px;font-weight:800;line-height:1;}
.stat-change{font-size:11px;margin-top:4px;}

/* GRID */
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;}
.plan-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}
.card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:22px;}
.card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;}
.card-title{font-size:14px;font-weight:700;}
.card-sub{font-size:12px;color:var(--muted);margin-top:2px;}
.card-action{font-size:12px;color:var(--red);font-weight:600;cursor:pointer;background:none;border:none;font-family:'Sora',sans-serif;}
.red-btn{background:var(--red);color:#fff;border:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:'Sora',sans-serif;}
.red-btn:hover{background:#e74c3c;}

/* HEALTH */
.health-wrap{display:flex;align-items:center;gap:20px;}
.health-ring{position:relative;width:80px;height:80px;flex-shrink:0;}
.health-ring svg{transform:rotate(-90deg);}
.ring-bg{fill:none;stroke:var(--surface3);stroke-width:8;}
.ring-fg{fill:none;stroke:var(--gold);stroke-width:8;stroke-linecap:round;stroke-dasharray:188;transition:stroke-dashoffset 0.6s ease;}
.health-center{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;}
.health-pct{font-size:18px;font-weight:800;color:var(--gold);}
.health-lbl{font-size:8px;color:var(--muted);text-transform:uppercase;}
.health-tips{flex:1;}
.health-tips h4{font-size:13px;font-weight:600;margin-bottom:8px;}
.tip-row{display:flex;align-items:center;gap:8px;font-size:12px;color:#aaa;margin-bottom:6px;}
.tip-dot{width:6px;height:6px;border-radius:50%;background:var(--red);flex-shrink:0;}

/* AI TOOLS */
.ai-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;}
.ai-tool{background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:14px;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;gap:10px;}
.ai-tool:hover:not(.locked){border-color:#333;background:var(--surface3);}
.ai-tool.locked{opacity:0.5;cursor:default;}
.ai-icon{font-size:20px;flex-shrink:0;}
.ai-name{font-size:12px;font-weight:600;margin-bottom:2px;}
.ai-desc{font-size:11px;color:var(--muted);}
.lock-badge{margin-left:auto;font-size:10px;background:var(--red-soft);color:var(--red);border:1px solid rgba(192,57,43,0.3);padding:2px 7px;border-radius:6px;white-space:nowrap;flex-shrink:0;}

/* LISTING PREVIEW */
.listing-preview{background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:16px;}
.biz-name{font-size:16px;font-weight:700;margin-bottom:4px;display:flex;align-items:center;gap:8px;}
.biz-cat{font-size:12px;color:var(--muted);margin-bottom:10px;}
.verified-badge{font-size:10px;font-weight:700;padding:2px 8px;border-radius:6px;background:rgba(39,174,96,0.15);color:#27ae60;border:1px solid rgba(39,174,96,0.3);}
.verified-badge.gold{background:var(--gold-soft);color:var(--gold);border-color:rgba(212,160,23,0.3);}
.listing-fields{display:flex;flex-direction:column;gap:8px;}
.lf-row{display:flex;align-items:center;justify-content:space-between;font-size:12px;}
.lf-label{color:var(--muted);}
.lf-value{color:#ccc;font-weight:500;}
.lf-value.missing{color:var(--red);font-style:italic;}
.edit-btn{width:100%;margin-top:14px;padding:10px;background:transparent;border:1px solid var(--border);border-radius:8px;color:#aaa;font-size:13px;font-weight:600;cursor:pointer;font-family:'Sora',sans-serif;transition:all 0.2s;}
.edit-btn:hover{border-color:var(--red);color:var(--red);}

/* CHART */
.chart{background:var(--surface2);border-radius:10px;height:120px;display:flex;align-items:flex-end;padding:12px;gap:6px;margin-bottom:12px;}
.bar{flex:1;border-radius:4px 4px 0 0;background:var(--red-soft);border:1px solid rgba(192,57,43,0.2);transition:all 0.3s;}
.bar:hover{background:rgba(192,57,43,0.4);}
.bar.today{background:var(--red);}
.chart-labels{display:flex;gap:6px;}
.chart-label{flex:1;text-align:center;font-size:9px;color:var(--muted);}
.locked-wrap{position:relative;}
.locked-wrap::after{content:'🔒 Upgrade';position:absolute;inset:0;background:rgba(10,10,10,0.85);display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--muted);border-radius:10px;backdrop-filter:blur(2px);}

/* MISC */
.empty-state{text-align:center;padding:32px 0;color:var(--muted);font-size:13px;display:flex;flex-direction:column;align-items:center;gap:8px;}
`

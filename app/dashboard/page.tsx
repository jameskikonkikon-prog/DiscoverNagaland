'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

// ── TYPES ──────────────────────────────────────────────────────────────────
type Plan = 'basic' | 'pro' | 'plus'

interface Business {
  id: string
  name: string
  category: string
  location: string
  phone: string | null
  whatsapp: string | null
  price_range: string | null
  opening_hours: string | null
  description: string | null
  photos: string[] | null
  slug: string
}

interface Stats {
  views_today: number
  views_yesterday: number
  whatsapp_clicks_today: number
  whatsapp_clicks_yesterday: number
  call_clicks_today: number
  call_clicks_yesterday: number
  total_views: number
  weekly: number[]
}

interface User {
  id: string
  full_name: string | null
  email: string
  plan: Plan
  founding_member: boolean
}

// ── HEALTH SCORE CALC ─────────────────────────────────────────────────────
function calcHealth(biz: Business | null): { score: number; tips: { text: string; done: boolean }[] } {
  if (!biz) return { score: 0, tips: [] }
  const checks = [
    { text: 'Add at least 2 photos', done: (biz.photos?.length ?? 0) >= 2 },
    { text: 'Set your price or price range', done: !!biz.price_range },
    { text: 'Add opening hours', done: !!biz.opening_hours },
    { text: 'Add a description', done: !!biz.description },
    { text: 'WhatsApp number added', done: !!biz.whatsapp },
  ]
  const done = checks.filter(c => c.done).length
  return { score: Math.round((done / checks.length) * 100), tips: checks }
}

// ── DASHBOARD PAGE ────────────────────────────────────────────────────────
export default function DashboardPage() {
  const supabase = createClientComponentClient()
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null)
  const [business, setBusiness] = useState<Business | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [foundingLeft, setFoundingLeft] = useState<number>(100)
  const [activeTab, setActiveTab] = useState<'overview' | 'listing' | 'ai' | 'analytics' | 'billing'>('overview')
  const [loading, setLoading] = useState(true)

  // ── LOAD DATA ────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      // Auth check
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      // Profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email, plan, founding_member')
        .eq('id', session.user.id)
        .single()

      if (!profile) { router.push('/login'); return }
      setUser({ ...profile, email: session.user.email ?? '' })

      // Business owned by this user
      const { data: biz } = await supabase
        .from('businesses')
        .select('id, name, category, location, phone, whatsapp, price_range, opening_hours, description, photos, slug')
        .eq('owner_id', session.user.id)
        .single()

      setBusiness(biz ?? null)

      // Stats (from business_stats table — fallback to zeros)
      if (biz) {
        const today = new Date().toISOString().split('T')[0]
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

        const { data: statsRows } = await supabase
          .from('business_stats')
          .select('date, views, whatsapp_clicks, call_clicks')
          .eq('business_id', biz.id)
          .gte('date', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0])
          .order('date', { ascending: true })

        const rows = statsRows ?? []
        const get = (date: string, field: keyof typeof rows[0]) =>
          (rows.find(r => r.date === date)?.[field] as number) ?? 0

        const totalRes = await supabase
          .from('business_stats')
          .select('views')
          .eq('business_id', biz.id)
        const totalViews = (totalRes.data ?? []).reduce((s, r) => s + (r.views ?? 0), 0)

        // Build weekly array (last 7 days Mon→Sun)
        const weekly = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(Date.now() - (6 - i) * 86400000).toISOString().split('T')[0]
          return get(d, 'views')
        })

        setStats({
          views_today: get(today, 'views'),
          views_yesterday: get(yesterday, 'views'),
          whatsapp_clicks_today: get(today, 'whatsapp_clicks'),
          whatsapp_clicks_yesterday: get(yesterday, 'whatsapp_clicks'),
          call_clicks_today: get(today, 'call_clicks'),
          call_clicks_yesterday: get(yesterday, 'call_clicks'),
          total_views: totalViews,
          weekly,
        })
      }

      // Founding member spots left
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('founding_member', true)
      setFoundingLeft(Math.max(0, 100 - (count ?? 0)))

      setLoading(false)
    }
    load()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // ── HELPERS ──────────────────────────────────────────────────────────────
  const health = calcHealth(business)
  const isPro = user?.plan === 'pro' || user?.plan === 'plus'
  const isPlus = user?.plan === 'plus'

  const statChange = (today: number, yesterday: number) => {
    if (yesterday === 0 && today === 0) return { label: 'No activity yet', color: 'var(--muted)' }
    if (yesterday === 0) return { label: `↑ ${today} today`, color: 'var(--green)' }
    const pct = Math.round(((today - yesterday) / yesterday) * 100)
    if (pct === 0) return { label: 'Same as yesterday', color: 'var(--muted)' }
    return {
      label: pct > 0 ? `↑ ${pct}% from yesterday` : `↓ ${Math.abs(pct)}% from yesterday`,
      color: pct > 0 ? 'var(--green)' : 'var(--red)',
    }
  }

  const weeklyMax = Math.max(...(stats?.weekly ?? [1]))
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const firstName = user?.full_name?.split(' ')[0] ?? 'there'

  // ── RENDER ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0a', color: '#666', fontFamily: 'Sora, sans-serif', fontSize: 14 }}>
        Loading your dashboard…
      </div>
    )
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="layout">

        {/* ── SIDEBAR ── */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-mark">📍</div>
            <div className="logo-text">Yana <span>Nagaland</span></div>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-section-label">Dashboard</div>
            {[
              { key: 'overview', icon: '📊', label: 'Overview' },
              { key: 'listing',  icon: '🏪', label: 'My Listing' },
              { key: 'ai',       icon: '🤖', label: 'AI Tools' },
              { key: 'analytics',icon: '📈', label: 'Analytics' },
            ].map(item => (
              <button
                key={item.key}
                className={`nav-item${activeTab === item.key ? ' active' : ''}`}
                onClick={() => setActiveTab(item.key as typeof activeTab)}
              >
                <span className="icon">{item.icon}</span> {item.label}
              </button>
            ))}
            <div className="nav-section-label">Settings</div>
            {[
              { key: 'billing', icon: '💳', label: 'Plan & Billing' },
              { icon: '⚙️', label: 'Settings', href: '/dashboard/settings' },
            ].map((item, i) => (
              item.href
                ? <a key={i} href={item.href} className="nav-item"><span className="icon">{item.icon}</span> {item.label}</a>
                : <button key={i} className={`nav-item${activeTab === item.key ? ' active' : ''}`} onClick={() => setActiveTab(item.key as typeof activeTab)}>
                    <span className="icon">{item.icon}</span> {item.label}
                  </button>
            ))}
          </nav>

          <div className="sidebar-bottom">
            <div className="plan-pill">
              <span className={`badge badge-${user?.plan ?? 'basic'}`}>{user?.plan ?? 'Basic'}</span>
              <div className="plan-info">
                <div className="plan-name">
                  {user?.plan === 'basic' ? 'Free Plan' : user?.plan === 'pro' ? 'Pro Plan' : 'Plus Plan'}
                </div>
                <div className="plan-sub">
                  {user?.plan === 'basic' ? 'Upgrade for more' :
                   user?.plan === 'pro' && user.founding_member ? 'Founding Member 🎖️' :
                   'All features unlocked'}
                </div>
              </div>
            </div>
            <button className="nav-item" onClick={signOut} style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted)', textAlign: 'left' }}>
              <span className="icon">🚪</span> Sign Out
            </button>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main className="main">

          {/* TOPBAR */}
          <div className="topbar">
            <div className="topbar-left">
              <h1>{greeting()}, {firstName} 👋</h1>
              <p>Here's how your business is doing today</p>
            </div>
            <div className="topbar-right">
              {business && (
                <a href={`/business/${business.slug}`} target="_blank" rel="noreferrer" className="view-listing-btn">
                  🔗 View Live Listing
                </a>
              )}
            </div>
          </div>

          {/* ── OVERVIEW TAB ── */}
          {activeTab === 'overview' && (
            <>
              {/* UPGRADE HOOK — Basic only */}
              {!isPro && (
                <div className="upgrade-hook" onClick={() => setActiveTab('billing')}>
                  <div className="hook-content">
                    <div className="hook-emoji">🚀</div>
                    <div>
                      <div className="hook-title">You're invisible to half your customers</div>
                      <div className="hook-sub">
                        Pro businesses rank <span>4x higher</span> in search.{' '}
                        <span>{foundingLeft} founding member spots left</span> — Pro is free right now.
                      </div>
                    </div>
                  </div>
                  <div className="hook-stats">
                    <div className="hook-stat"><div className="val">4x</div><div className="lbl">More clicks</div></div>
                    <div className="hook-stat"><div className="val">Free</div><div className="lbl">Right now</div></div>
                  </div>
                  <button className="hook-btn">See Plans →</button>
                </div>
              )}

              {/* FOUNDING MEMBER BANNER — Pro only */}
              {user?.plan === 'pro' && user.founding_member && (
                <div className="founding-banner">
                  <span>🎖️</span>
                  <div>
                    <div className="founding-title">Founding Member</div>
                    <div className="founding-sub">You're one of the first 100 businesses on Yana. Pro is free for you — forever.</div>
                  </div>
                </div>
              )}

              {/* PLUS BANNER */}
              {isPlus && (
                <div className="plus-banner">
                  <span>⭐</span>
                  <div>
                    <div className="founding-title">Plus Member — Gold Verified</div>
                    <div className="founding-sub">Your listing appears first in search results. Gold badge visible to all customers.</div>
                  </div>
                </div>
              )}

              {/* STATS ROW */}
              <div className="stats-row">
                {[
                  {
                    icon: '👁️', label: 'Views today',
                    value: stats?.views_today ?? 0,
                    change: statChange(stats?.views_today ?? 0, stats?.views_yesterday ?? 0),
                  },
                  {
                    icon: '💬', label: 'WhatsApp clicks',
                    value: stats?.whatsapp_clicks_today ?? 0,
                    change: statChange(stats?.whatsapp_clicks_today ?? 0, stats?.whatsapp_clicks_yesterday ?? 0),
                  },
                  {
                    icon: '📞', label: 'Call clicks',
                    value: stats?.call_clicks_today ?? 0,
                    change: statChange(stats?.call_clicks_today ?? 0, stats?.call_clicks_yesterday ?? 0),
                  },
                  {
                    icon: '📅', label: 'Total views',
                    value: stats?.total_views ?? 0,
                    change: { label: 'Since you joined', color: 'var(--muted)' },
                  },
                ].map((s, i) => (
                  <div key={i} className="stat-card">
                    <div className="stat-icon">{s.icon}</div>
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-value">{s.value.toLocaleString()}</div>
                    <div className="stat-change" style={{ color: s.change.color }}>{s.change.label}</div>
                  </div>
                ))}
              </div>

              {/* TWO COL */}
              <div className="two-col">

                {/* LISTING HEALTH */}
                <div className="section-card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">Listing Health</div>
                      <div className="card-sub">Complete your profile to get more customers</div>
                    </div>
                    <button className="card-action" onClick={() => setActiveTab('listing')}>Fix Now →</button>
                  </div>
                  <div className="health-section">
                    <div className="health-ring">
                      <svg width="80" height="80" viewBox="0 0 80 80">
                        <circle className="progress-bg" cx="40" cy="40" r="30" />
                        <circle
                          className="progress"
                          cx="40" cy="40" r="30"
                          style={{ strokeDashoffset: 188 - (188 * health.score) / 100 }}
                        />
                      </svg>
                      <div className="health-center">
                        <div className="pct">{health.score}%</div>
                        <div className="lbl">Complete</div>
                      </div>
                    </div>
                    <div className="health-tips">
                      <h4>Fix these to get more customers:</h4>
                      {health.tips.map((tip, i) => (
                        <div key={i} className="tip-item" style={tip.done ? { color: '#27ae60' } : {}}>
                          <div className="dot" style={tip.done ? { background: '#27ae60' } : {}} />
                          {tip.text}{tip.done ? ' ✓' : ''}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* AI TOOLS */}
                <div className="section-card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">AI Tools</div>
                      <div className="card-sub">Let AI grow your business</div>
                    </div>
                  </div>
                  <div className="ai-grid">
                    {[
                      { icon: '✨', name: 'Write Description', desc: isPro ? 'Unlimited' : 'One free use', locked: false },
                      { icon: '📈', name: 'Growth Advisor', desc: isPro ? 'Unlimited' : 'One free use', locked: false },
                      { icon: '📷', name: 'Menu Reader', desc: 'Read price boards', locked: !isPro, badge: 'Pro' },
                      { icon: '⚔️', name: 'Competitor Intel', desc: 'Beat the competition', locked: !isPlus, badge: 'Plus' },
                    ].map((tool, i) => (
                      <div key={i} className={`ai-tool${tool.locked ? ' locked' : ''}`} onClick={() => !tool.locked && setActiveTab('ai')}>
                        <div className="ai-tool-icon">{tool.icon}</div>
                        <div className="ai-tool-text">
                          <div className="name">{tool.name}</div>
                          <div className="desc">{tool.desc}</div>
                        </div>
                        {tool.locked && <div className="lock-badge pro">{tool.badge}</div>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* LISTING PREVIEW */}
                <div className="section-card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">Your Listing</div>
                      <div className="card-sub">What customers see</div>
                    </div>
                    <button className="card-action" onClick={() => setActiveTab('listing')}>Edit →</button>
                  </div>
                  {business ? (
                    <div className="listing-preview">
                      <div className="biz-name">{business.name}</div>
                      <div className="biz-cat">{business.category} · {business.location}</div>
                      <div className="listing-fields">
                        {[
                          { label: 'Phone',       value: business.phone },
                          { label: 'Price',        value: business.price_range },
                          { label: 'Hours',        value: business.opening_hours },
                          { label: 'Photos',       value: business.photos?.length ? `${business.photos.length} added` : null },
                          { label: 'Description',  value: business.description ? business.description.slice(0, 40) + '…' : null },
                        ].map((f, i) => (
                          <div key={i} className="listing-field">
                            <span className="field-label">{f.label}</span>
                            <span className={`field-value${!f.value ? ' missing' : ''}`}>
                              {f.value ?? 'Not added'}
                            </span>
                          </div>
                        ))}
                      </div>
                      <button className="edit-btn" onClick={() => setActiveTab('listing')}>✏️ Edit Full Listing</button>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)', fontSize: 13 }}>
                      <div style={{ fontSize: 32, marginBottom: 10 }}>🏪</div>
                      <div>No listing yet</div>
                      <a href="/dashboard/add-listing" style={{ color: 'var(--red)', fontWeight: 600, fontSize: 13, textDecoration: 'none', display: 'block', marginTop: 10 }}>
                        + Add your business →
                      </a>
                    </div>
                  )}
                </div>

                {/* ANALYTICS */}
                <div className="section-card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">Weekly Analytics</div>
                      <div className="card-sub">Views this week</div>
                    </div>
                  </div>
                  <div className={isPro ? '' : 'locked-overlay'}>
                    <div className="chart-placeholder">
                      {(stats?.weekly ?? Array(7).fill(0)).map((val, i) => (
                        <div
                          key={i}
                          className={`bar${i === 6 ? ' today' : ''}`}
                          style={{ height: `${weeklyMax === 0 ? 10 : Math.max(8, (val / weeklyMax) * 100)}%` }}
                          title={`${weekDays[i]}: ${val} views`}
                        />
                      ))}
                    </div>
                    <div className="chart-labels">
                      {weekDays.map(d => <div key={d} className="chart-label">{d}</div>)}
                    </div>
                  </div>
                  {!isPro && (
                    <button className="hook-btn" style={{ marginTop: 14, width: '100%' }} onClick={() => setActiveTab('billing')}>
                      Unlock Analytics →
                    </button>
                  )}
                </div>

              </div>
            </>
          )}

          {/* ── LISTING TAB ── */}
          {activeTab === 'listing' && (
            <div className="section-card">
              <div className="card-header">
                <div>
                  <div className="card-title">My Listing</div>
                  <div className="card-sub">Manage your business profile</div>
                </div>
                {business && (
                  <a href={`/dashboard/edit-listing/${business.id}`} className="hook-btn" style={{ textDecoration: 'none', padding: '8px 16px', fontSize: 13 }}>
                    ✏️ Edit Listing
                  </a>
                )}
              </div>
              {business ? (
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{business.name}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>{business.category} · {business.location}</div>
                  <div className="listing-fields" style={{ maxWidth: 480 }}>
                    {[
                      { label: 'Phone',       value: business.phone },
                      { label: 'WhatsApp',    value: business.whatsapp },
                      { label: 'Price Range', value: business.price_range },
                      { label: 'Hours',       value: business.opening_hours },
                      { label: 'Photos',      value: business.photos?.length ? `${business.photos.length} photo(s)` : null },
                      { label: 'Description', value: business.description },
                    ].map((f, i) => (
                      <div key={i} className="listing-field" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                        <span className="field-label">{f.label}</span>
                        <span className={`field-value${!f.value ? ' missing' : ''}`}>{f.value ?? 'Not added'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🏪</div>
                  <p style={{ fontSize: 14, marginBottom: 16 }}>You haven't added a business yet</p>
                  <a href="/dashboard/add-listing" className="hook-btn" style={{ textDecoration: 'none', display: 'inline-block', padding: '10px 24px' }}>
                    + Add Your Business
                  </a>
                </div>
              )}
            </div>
          )}

          {/* ── AI TOOLS TAB ── */}
          {activeTab === 'ai' && (
            <div>
              <div className="section-card" style={{ marginBottom: 16 }}>
                <div className="card-header">
                  <div>
                    <div className="card-title">AI Tools</div>
                    <div className="card-sub">Powered by Claude — let AI grow your business</div>
                  </div>
                </div>
                <div className="ai-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                  {[
                    { icon: '✨', name: 'Write Description', desc: 'Auto-generate a compelling business description', locked: false, href: '/dashboard/ai/description' },
                    { icon: '📈', name: 'Growth Advisor',   desc: 'Get personalized tips to attract more customers', locked: false, href: '/dashboard/ai/growth' },
                    { icon: '📷', name: 'Menu Reader',       desc: 'Upload a photo of your menu to extract prices', locked: !isPro, badge: 'Pro', href: '/dashboard/ai/menu' },
                    { icon: '⚔️', name: 'Competitor Intel',  desc: 'See how you compare to similar businesses',      locked: !isPlus, badge: 'Plus', href: '/dashboard/ai/competitor' },
                  ].map((tool, i) => (
                    tool.locked ? (
                      <div key={i} className="ai-tool locked">
                        <div className="ai-tool-icon">{tool.icon}</div>
                        <div className="ai-tool-text">
                          <div className="name">{tool.name}</div>
                          <div className="desc">{tool.desc}</div>
                        </div>
                        <div className="lock-badge pro">{tool.badge}</div>
                      </div>
                    ) : (
                      <a key={i} href={tool.href} className="ai-tool" style={{ textDecoration: 'none' }}>
                        <div className="ai-tool-icon">{tool.icon}</div>
                        <div className="ai-tool-text">
                          <div className="name">{tool.name}</div>
                          <div className="desc">{tool.desc}</div>
                        </div>
                      </a>
                    )
                  ))}
                </div>
              </div>
              {!isPro && (
                <div className="upgrade-hook" onClick={() => setActiveTab('billing')}>
                  <div className="hook-content">
                    <div className="hook-emoji">🤖</div>
                    <div>
                      <div className="hook-title">Unlock all AI tools</div>
                      <div className="hook-sub">Pro gives you unlimited AI usage. <span>{foundingLeft} founding spots left.</span></div>
                    </div>
                  </div>
                  <button className="hook-btn">Upgrade Free →</button>
                </div>
              )}
            </div>
          )}

          {/* ── ANALYTICS TAB ── */}
          {activeTab === 'analytics' && (
            <div className="section-card">
              <div className="card-header">
                <div>
                  <div className="card-title">Analytics</div>
                  <div className="card-sub">Views, clicks & engagement</div>
                </div>
              </div>
              {isPro ? (
                <>
                  <div className="stats-row" style={{ marginBottom: 24 }}>
                    {[
                      { icon: '👁️', label: 'Views today',     value: stats?.views_today ?? 0 },
                      { icon: '💬', label: 'WhatsApp clicks', value: stats?.whatsapp_clicks_today ?? 0 },
                      { icon: '📞', label: 'Call clicks',     value: stats?.call_clicks_today ?? 0 },
                      { icon: '📅', label: 'Total views',     value: stats?.total_views ?? 0 },
                    ].map((s, i) => (
                      <div key={i} className="stat-card">
                        <div className="stat-icon">{s.icon}</div>
                        <div className="stat-label">{s.label}</div>
                        <div className="stat-value">{s.value.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 600 }}>Views — Last 7 Days</div>
                  <div className="chart-placeholder" style={{ height: 160 }}>
                    {(stats?.weekly ?? Array(7).fill(0)).map((val, i) => (
                      <div
                        key={i}
                        className={`bar${i === 6 ? ' today' : ''}`}
                        style={{ height: `${weeklyMax === 0 ? 10 : Math.max(8, (val / weeklyMax) * 100)}%`, position: 'relative' }}
                        title={`${weekDays[i]}: ${val} views`}
                      >
                        <span style={{ position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)', fontSize: 9, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{val}</span>
                      </div>
                    ))}
                  </div>
                  <div className="chart-labels">
                    {weekDays.map(d => <div key={d} className="chart-label">{d}</div>)}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '48px 0' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Analytics is a Pro feature</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>{foundingLeft} founding spots left — Pro is free right now</div>
                  <button className="hook-btn" onClick={() => setActiveTab('billing')}>Upgrade Free →</button>
                </div>
              )}
            </div>
          )}

          {/* ── BILLING TAB ── */}
          {activeTab === 'billing' && (
            <div>
              <div className="card-title" style={{ fontSize: 18, marginBottom: 4 }}>Plan & Billing</div>
              <div className="card-sub" style={{ marginBottom: 24 }}>You're on the <strong style={{ color: user?.plan === 'plus' ? 'var(--gold)' : user?.plan === 'pro' ? 'var(--red)' : '#888' }}>{user?.plan?.toUpperCase()}</strong> plan</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {[
                  {
                    plan: 'basic', name: 'Basic', price: 'Free', sub: 'Forever',
                    features: ['List your business', 'Basic profile page', '1 AI use (description)', '1 AI use (growth)'],
                    locked: ['Analytics', 'Menu Reader', 'Competitor Intel', 'Verified badge'],
                    current: user?.plan === 'basic',
                  },
                  {
                    plan: 'pro', name: 'Pro', price: foundingLeft > 0 ? 'Free*' : '₹299', sub: foundingLeft > 0 ? `${foundingLeft} founding spots left` : '/month',
                    features: ['Everything in Basic', 'Full analytics', 'Unlimited AI tools', 'Founding Member badge', 'Menu Reader'],
                    locked: ['Gold verified badge', 'Always first placement'],
                    current: user?.plan === 'pro',
                  },
                  {
                    plan: 'plus', name: 'Plus', price: '₹499', sub: '/month',
                    features: ['Everything in Pro', 'Gold verified badge', 'Always first in search', 'Competitor Intel', 'Priority support'],
                    locked: [],
                    current: user?.plan === 'plus',
                  },
                ].map((p) => (
                  <div key={p.plan} className="section-card" style={{ border: p.current ? '1px solid var(--red)' : undefined }}>
                    <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{p.name}</div>
                    <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 4, color: p.plan === 'plus' ? 'var(--gold)' : p.plan === 'pro' ? 'var(--red)' : 'var(--muted)' }}>
                      {p.price} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--muted)' }}>{p.sub}</span>
                    </div>
                    <div style={{ borderBottom: '1px solid var(--border)', marginBottom: 12, paddingBottom: 12 }} />
                    {p.features.map((f, i) => <div key={i} style={{ fontSize: 12, color: '#ccc', marginBottom: 6 }}>✓ {f}</div>)}
                    {p.locked.map((f, i) => <div key={i} style={{ fontSize: 12, color: '#444', marginBottom: 6, textDecoration: 'line-through' }}>{f}</div>)}
                    <div style={{ marginTop: 16 }}>
                      {p.current ? (
                        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--green)', fontWeight: 700 }}>✓ Current Plan</div>
                      ) : (
                        <a href={`/pricing?plan=${p.plan}`} className="hook-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', padding: '10px', fontSize: 13 }}>
                          {p.plan === 'basic' ? 'Downgrade' : 'Upgrade →'}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>
    </>
  )
}

// ── STYLES ─────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; }
:root {
  --bg: #0a0a0a; --surface: #111111; --surface2: #171717; --surface3: #1e1e1e;
  --border: #222222; --red: #c0392b; --red-soft: rgba(192,57,43,0.12);
  --gold: #D4A017; --gold-soft: rgba(212,160,23,0.12);
  --green: #27ae60; --green-soft: rgba(39,174,96,0.12);
  --text: #ffffff; --muted: #666; --muted2: #333;
}
body { font-family: 'Sora', sans-serif; background: var(--bg); color: var(--text); }
.layout { display: flex; min-height: 100vh; }
.sidebar { width: 220px; background: var(--surface); border-right: 1px solid var(--border); padding: 24px 0; flex-shrink: 0; display: flex; flex-direction: column; position: fixed; top: 0; left: 0; bottom: 0; }
.sidebar-logo { display: flex; align-items: center; gap: 10px; padding: 0 20px 24px; border-bottom: 1px solid var(--border); }
.logo-mark { width: 32px; height: 32px; background: var(--red); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; }
.logo-text { font-size: 15px; font-weight: 800; letter-spacing: -0.5px; }
.logo-text span { color: var(--red); }
.sidebar-nav { padding: 16px 12px; flex: 1; display: flex; flex-direction: column; gap: 4px; }
.nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; font-size: 13px; font-weight: 500; color: var(--muted); cursor: pointer; transition: all 0.2s; text-decoration: none; font-family: 'Sora', sans-serif; }
.nav-item:hover { background: var(--surface2); color: #ccc; }
.nav-item.active { background: var(--red-soft); color: var(--red); font-weight: 600; }
.nav-item .icon { font-size: 16px; width: 20px; text-align: center; }
.nav-section-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: var(--muted2); padding: 12px 12px 6px; }
.sidebar-bottom { padding: 16px 12px; border-top: 1px solid var(--border); }
.plan-pill { display: flex; align-items: center; gap: 8px; background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; margin-bottom: 8px; }
.badge { font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
.badge-basic { background: #333; color: #888; }
.badge-pro { background: var(--red-soft); color: var(--red); border: 1px solid rgba(192,57,43,0.3); }
.badge-plus { background: var(--gold-soft); color: var(--gold); border: 1px solid rgba(212,160,23,0.3); }
.plan-pill .plan-info { flex: 1; }
.plan-pill .plan-name { font-size: 12px; font-weight: 600; }
.plan-pill .plan-sub { font-size: 10px; color: var(--muted); }
.main { margin-left: 220px; flex: 1; padding: 28px; max-width: calc(100vw - 220px); }
.topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; }
.topbar-left h1 { font-size: 20px; font-weight: 700; }
.topbar-left p { font-size: 13px; color: var(--muted); margin-top: 2px; }
.topbar-right { display: flex; align-items: center; gap: 10px; }
.view-listing-btn { display: flex; align-items: center; gap: 6px; background: var(--surface2); border: 1px solid var(--border); color: #ccc; padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; font-family: 'Sora', sans-serif; text-decoration: none; }
.view-listing-btn:hover { border-color: #444; color: #fff; }
.upgrade-hook { background: linear-gradient(135deg, #150808, #111); border: 1px solid #2a1212; border-left: 3px solid var(--red); border-radius: 14px; padding: 18px 22px; display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px; cursor: pointer; transition: all 0.2s; }
.upgrade-hook:hover { box-shadow: 0 4px 24px rgba(192,57,43,0.1); }
.hook-content { display: flex; align-items: center; gap: 14px; flex: 1; }
.hook-emoji { font-size: 24px; }
.hook-title { font-size: 14px; font-weight: 700; margin-bottom: 3px; }
.hook-sub { font-size: 12px; color: var(--muted); }
.hook-sub span { color: var(--red); font-weight: 600; }
.hook-stats { display: flex; gap: 20px; }
.hook-stat { text-align: center; }
.hook-stat .val { font-size: 18px; font-weight: 800; color: var(--red); }
.hook-stat .lbl { font-size: 10px; color: var(--muted); text-transform: uppercase; }
.hook-btn { background: var(--red); color: #fff; border: none; padding: 10px 18px; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap; font-family: 'Sora', sans-serif; flex-shrink: 0; }
.founding-banner { background: linear-gradient(135deg, #0d1a0d, #111); border: 1px solid rgba(39,174,96,0.3); border-left: 3px solid var(--green); border-radius: 14px; padding: 16px 20px; display: flex; align-items: center; gap: 14px; margin-bottom: 24px; font-size: 20px; }
.founding-title { font-size: 14px; font-weight: 700; margin-bottom: 2px; }
.founding-sub { font-size: 12px; color: var(--muted); }
.plus-banner { background: linear-gradient(135deg, #1a1500, #111); border: 1px solid rgba(212,160,23,0.3); border-left: 3px solid var(--gold); border-radius: 14px; padding: 16px 20px; display: flex; align-items: center; gap: 14px; margin-bottom: 24px; font-size: 20px; }
.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
.stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 18px; transition: all 0.2s; }
.stat-card:hover { border-color: #333; transform: translateY(-1px); }
.stat-icon { font-size: 20px; margin-bottom: 10px; }
.stat-label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
.stat-value { font-size: 28px; font-weight: 800; line-height: 1; }
.stat-change { font-size: 11px; color: var(--green); margin-top: 4px; }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
.section-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 22px; }
.section-card.full { grid-column: 1 / -1; }
.card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
.card-title { font-size: 14px; font-weight: 700; }
.card-sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
.card-action { font-size: 12px; color: var(--red); font-weight: 600; cursor: pointer; background: none; border: none; font-family: 'Sora', sans-serif; }
.health-section { display: flex; align-items: center; gap: 20px; }
.health-ring { position: relative; width: 80px; height: 80px; flex-shrink: 0; }
.health-ring svg { transform: rotate(-90deg); }
.health-ring .progress-bg { fill: none; stroke: var(--surface3); stroke-width: 8; }
.health-ring .progress { fill: none; stroke: var(--gold); stroke-width: 8; stroke-linecap: round; stroke-dasharray: 188; transition: stroke-dashoffset 0.6s ease; }
.health-center { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; }
.health-center .pct { font-size: 18px; font-weight: 800; color: var(--gold); }
.health-center .lbl { font-size: 8px; color: var(--muted); text-transform: uppercase; }
.health-tips { flex: 1; }
.health-tips h4 { font-size: 13px; font-weight: 600; margin-bottom: 8px; }
.tip-item { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #aaa; margin-bottom: 6px; }
.tip-item .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--red); flex-shrink: 0; }
.ai-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.ai-tool { background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 14px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 10px; }
.ai-tool:hover { border-color: #333; background: var(--surface3); }
.ai-tool.locked { opacity: 0.5; cursor: default; }
.ai-tool-icon { font-size: 20px; flex-shrink: 0; }
.ai-tool-text .name { font-size: 12px; font-weight: 600; margin-bottom: 2px; }
.ai-tool-text .desc { font-size: 11px; color: var(--muted); }
.lock-badge { margin-left: auto; font-size: 10px; background: var(--surface3); border: 1px solid var(--border); color: var(--muted); padding: 2px 7px; border-radius: 6px; white-space: nowrap; flex-shrink: 0; }
.lock-badge.pro { background: var(--red-soft); color: var(--red); border-color: rgba(192,57,43,0.3); }
.listing-preview { background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 16px; }
.listing-preview .biz-name { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
.listing-preview .biz-cat { font-size: 12px; color: var(--muted); margin-bottom: 10px; }
.listing-fields { display: flex; flex-direction: column; gap: 8px; }
.listing-field { display: flex; align-items: center; justify-content: space-between; font-size: 12px; }
.field-label { color: var(--muted); }
.field-value { color: #ccc; font-weight: 500; }
.field-value.missing { color: var(--red); font-style: italic; }
.edit-btn { width: 100%; margin-top: 14px; padding: 10px; background: transparent; border: 1px solid var(--border); border-radius: 8px; color: #aaa; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Sora', sans-serif; transition: all 0.2s; }
.edit-btn:hover { border-color: var(--red); color: var(--red); }
.chart-placeholder { background: var(--surface2); border-radius: 10px; height: 120px; display: flex; align-items: flex-end; padding: 12px; gap: 6px; margin-bottom: 12px; }
.bar { flex: 1; border-radius: 4px 4px 0 0; background: var(--red-soft); border: 1px solid rgba(192,57,43,0.2); transition: all 0.3s; position: relative; }
.bar:hover { background: var(--red); }
.bar.today { background: var(--red); }
.chart-labels { display: flex; gap: 6px; }
.chart-label { flex: 1; text-align: center; font-size: 9px; color: var(--muted); }
.locked-overlay { position: relative; }
.locked-overlay::after { content: '🔒 Pro feature — Upgrade to unlock'; position: absolute; inset: 0; background: rgba(10,10,10,0.85); display: flex; align-items: center; justify-content: center; font-size: 12px; color: var(--muted); border-radius: 10px; backdrop-filter: blur(2px); }
`

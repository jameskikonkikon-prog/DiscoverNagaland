'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

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

// ── FOUNDING SPOTS ────────────────────────────────────────────────────────
const FOUNDING_LIMIT = 100

// ── DASHBOARD ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const supabase = createClientComponentClient()
  const router   = useRouter()

  const [userId,       setUserId]       = useState<string | null>(null)
  const [userEmail,    setUserEmail]    = useState<string>('')
  const [business,     setBusiness]     = useState<Business | null>(null)
  const [analytics,    setAnalytics]    = useState<Analytics | null>(null)
  const [foundingLeft, setFoundingLeft] = useState<number>(FOUNDING_LIMIT)
  const [activeTab,    setActiveTab]    = useState<'overview' | 'listing' | 'ai' | 'analytics' | 'billing'>('overview')
  const [loading,      setLoading]      = useState(true)

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
      }

      // Founding spots: count pro/plus businesses
      const { count } = await supabase
        .from('businesses')
        .select('id', { count: 'exact', head: true })
        .in('plan', ['pro', 'plus'])
      setFoundingLeft(Math.max(0, FOUNDING_LIMIT - (count ?? 0)))

      setLoading(false)
    }
    load()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────
  const plan    = business?.plan ?? 'basic'
  const isPro   = plan === 'pro' || plan === 'plus'
  const isPlus  = plan === 'plus'
  const health  = calcHealth(business)

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
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#0a0a0a', color:'#555', fontFamily:'Sora,sans-serif', fontSize:14 }}>
      Loading your dashboard…
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
            <div className="logo-mark">📍</div>
            <div className="logo-text">Yana <span>Nagaland</span></div>
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
            <a href="/dashboard/settings" className="nav-item">
              <span className="icon">⚙️</span>Settings
            </a>
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
                      <span>{foundingLeft} founding spots left</span> — Pro is free right now.
                    </div>
                  </div>
                </div>
                <div className="hook-stats">
                  <div className="hook-stat"><div className="val">4x</div><div className="lbl">More clicks</div></div>
                  <div className="hook-stat"><div className="val">Free</div><div className="lbl">Right now</div></div>
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
            <div className="stats-row">
              {[
                { icon:'👁️', label:'Views today',      value: analytics?.views_today ?? 0,    ...delta(analytics?.views_today ?? 0, analytics?.views_yesterday ?? 0) },
                { icon:'💬', label:'WhatsApp clicks',  value: analytics?.whatsapp_today ?? 0, ...delta(analytics?.whatsapp_today ?? 0, analytics?.whatsapp_yesterday ?? 0) },
                { icon:'📞', label:'Call clicks',      value: analytics?.calls_today ?? 0,    ...delta(analytics?.calls_today ?? 0, analytics?.calls_yesterday ?? 0) },
                { icon:'📅', label:'Total views',      value: analytics?.total_views ?? 0,    label2: 'Since you joined', color: 'var(--muted)' },
              ].map((s, i) => (
                <div key={i} className="stat-card">
                  <div className="stat-icon">{s.icon}</div>
                  <div className="stat-label">{s.label}</div>
                  <div className="stat-value">{s.value.toLocaleString()}</div>
                  <div className="stat-change" style={{ color: s.color }}>{(s as any).label2 ?? s.label}</div>
                </div>
              ))}
            </div>

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
                    { icon:'✨', name:'Write Description', desc: isPro ? 'Unlimited' : 'One free use',  locked:false },
                    { icon:'📈', name:'Growth Advisor',    desc: isPro ? 'Unlimited' : 'One free use',  locked:false },
                    { icon:'📷', name:'Menu Reader',       desc:'Read price boards',                    locked:!isPro,  badge:'Pro'  },
                    { icon:'⚔️', name:'Competitor Intel',  desc:'Beat the competition',                 locked:!isPlus, badge:'Plus' },
                  ].map((tool, i) => (
                    <div key={i} className={`ai-tool${tool.locked ? ' locked' : ''}`}
                      onClick={() => !tool.locked && setActiveTab('ai')}>
                      <span className="ai-icon">{tool.icon}</span>
                      <div>
                        <div className="ai-name">{tool.name}</div>
                        <div className="ai-desc">{tool.desc}</div>
                      </div>
                      {tool.locked && <span className="lock-badge">{tool.badge}</span>}
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
                      {(business.verified || business.is_verified) && (
                        <span className={`verified-badge${isPlus ? ' gold' : ''}`}>
                          {isPlus ? '⭐ Verified' : '✓ Verified'}
                        </span>
                      )}
                    </div>
                    <div className="biz-cat">{business.category}{location ? ` · ${location}` : ''}</div>
                    <div className="listing-fields">
                      {[
                        { label:'Phone',       value: business.phone },
                        { label:'WhatsApp',    value: business.whatsapp },
                        { label:'Price',       value: business.price_range },
                        { label:'Hours',       value: business.opening_hours },
                        { label:'Photos',      value: business.photos?.length ? `${business.photos.length} added` : null },
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
                  <a href={`/dashboard/edit-listing/${business.id}`} className="red-btn"
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
                    { icon:'✨', name:'Write Description', desc:'Auto-generate a compelling business description', locked:false,   href:'/dashboard/ai/description' },
                    { icon:'📈', name:'Growth Advisor',    desc:'Get personalised tips to attract more customers', locked:false,   href:'/dashboard/ai/growth'      },
                    { icon:'📷', name:'Menu Reader',       desc:'Upload a photo of your menu to extract prices',  locked:!isPro,  badge:'Pro',  href:'/dashboard/ai/menu'        },
                    { icon:'⚔️', name:'Competitor Intel',  desc:'See how you compare to similar businesses',      locked:!isPlus, badge:'Plus', href:'/dashboard/ai/competitor'  },
                  ].map((tool, i) =>
                    tool.locked ? (
                      <div key={i} className="ai-tool locked">
                        <span className="ai-icon">{tool.icon}</span>
                        <div>
                          <div className="ai-name">{tool.name}</div>
                          <div className="ai-desc">{tool.desc}</div>
                        </div>
                        <span className="lock-badge">{tool.badge}</span>
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
                      <div className="hook-sub">Pro gives unlimited AI. <span>{foundingLeft} founding spots left.</span></div>
                    </div>
                  </div>
                  <button className="red-btn">Upgrade Free →</button>
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
                    {foundingLeft} founding spots left — Pro is free right now
                  </div>
                  <button className="red-btn" onClick={() => setActiveTab('billing')}>Upgrade Free →</button>
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
              <div className="plan-grid">
                {([
                  {
                    key:'basic', name:'Basic', price:'Free', sub:'Forever',
                    color:'#888',
                    features:['List your business','Basic profile page','1x AI description','1x Growth Advisor'],
                    locked:['Analytics','Menu Reader','Competitor Intel','Verified badge'],
                  },
                  {
                    key:'pro', name:'Pro',
                    price: foundingLeft > 0 ? 'Free*' : '₹299',
                    sub:   foundingLeft > 0 ? `${foundingLeft} founding spots left` : '/month',
                    color:'var(--red)',
                    features:['Everything in Basic','Full analytics','Unlimited AI tools','Founding Member badge','Menu Reader'],
                    locked:['Gold verified badge','Always first placement'],
                  },
                  {
                    key:'plus', name:'Plus', price:'₹499', sub:'/month',
                    color:'var(--gold)',
                    features:['Everything in Pro','Gold verified badge','Always first in search','Competitor Intel','Priority support'],
                    locked:[],
                  },
                ] as const).map(p => (
                  <div key={p.key} className="card" style={{ border: plan === p.key ? '1px solid var(--red)' : undefined }}>
                    <div style={{ fontSize:18, fontWeight:800, marginBottom:4 }}>{p.name}</div>
                    <div style={{ fontSize:26, fontWeight:800, marginBottom:14, color: p.color }}>
                      {p.price} <span style={{ fontSize:12, fontWeight:400, color:'var(--muted)' }}>{p.sub}</span>
                    </div>
                    <div style={{ borderBottom:'1px solid var(--border)', marginBottom:12 }}/>
                    {p.features.map((f, i) => (
                      <div key={i} style={{ fontSize:12, color:'#ccc', marginBottom:6 }}>✓ {f}</div>
                    ))}
                    {p.locked.map((f, i) => (
                      <div key={i} style={{ fontSize:12, color:'#444', marginBottom:6, textDecoration:'line-through' }}>{f}</div>
                    ))}
                    <div style={{ marginTop:16 }}>
                      {plan === p.key ? (
                        <div style={{ textAlign:'center', fontSize:12, color:'var(--green)', fontWeight:700 }}>✓ Current Plan</div>
                      ) : (
                        <a href={`/pricing?plan=${p.key}`} className="red-btn"
                          style={{ display:'block', textAlign:'center', textDecoration:'none', padding:'10px', fontSize:13 }}>
                          {p.key === 'basic' ? 'Downgrade' : 'Upgrade →'}
                        </a>
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
.sidebar-logo{display:flex;align-items:center;gap:10px;padding:0 20px 24px;border-bottom:1px solid var(--border);}
.logo-mark{width:32px;height:32px;background:var(--red);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;}
.logo-text{font-size:15px;font-weight:800;letter-spacing:-0.5px;}
.logo-text span{color:var(--red);}
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
.locked-wrap::after{content:'🔒 Pro feature — Upgrade to unlock';position:absolute;inset:0;background:rgba(10,10,10,0.85);display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--muted);border-radius:10px;backdrop-filter:blur(2px);}

/* MISC */
.empty-state{text-align:center;padding:32px 0;color:var(--muted);font-size:13px;display:flex;flex-direction:column;align-items:center;gap:8px;}
`

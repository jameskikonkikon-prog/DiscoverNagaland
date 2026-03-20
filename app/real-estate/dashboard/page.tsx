'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

interface Property {
  id: string
  title: string
  property_type: string
  listing_type: string
  city: string
  locality: string | null
  price: number
  price_unit: string | null
  is_available: boolean
  last_verified_at: string | null
  created_at: string
  photos: string[] | null
}

function freshness(last_verified_at: string | null): { label: string; color: string } {
  if (!last_verified_at) return { label: 'Unverified', color: 'rgba(255,255,255,0.25)' }
  const days = (Date.now() - new Date(last_verified_at).getTime()) / 86400000
  if (days <= 23) return { label: 'Active', color: '#3ba88f' }
  if (days <= 30) return { label: 'Expiring Soon', color: '#e8a908' }
  return { label: 'Expired', color: '#c0392b' }
}

function fmt(price: number) {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)}Cr`
  if (price >= 100000)   return `₹${(price / 100000).toFixed(1)}L`
  return `₹${price.toLocaleString('en-IN')}`
}

export default function RealEstateDashboard() {
  const router = useRouter()
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  )
  const [loading,      setLoading]      = useState(true)
  const [properties,   setProperties]   = useState<Property[]>([])
  const [activeCount,  setActiveCount]  = useState(0)
  const [refreshing,    setRefreshing]    = useState<string | null>(null)
  const [refreshError,  setRefreshError]  = useState<string | null>(null)
  const [disabling,     setDisabling]     = useState<string | null>(null)
  const [disableError,  setDisableError]  = useState<string | null>(null)

  async function handleDisable(id: string) {
    setDisabling(id)
    setDisableError(null)
    try {
      const res = await fetch('/api/real-estate', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const json = await res.json()
      if (!res.ok) { setDisableError(json.error ?? 'Failed to update listing'); return }
      setProperties(prev => prev.map(p => p.id === id ? { ...p, is_available: false } : p))
      setActiveCount(prev => Math.max(0, prev - 1))
    } catch {
      setDisableError('Network error. Please try again.')
    } finally {
      setDisabling(null)
    }
  }

  async function handleRefresh(id: string) {
    setRefreshing(id)
    setRefreshError(null)
    try {
      const res = await fetch('/api/real-estate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const json = await res.json()
      if (!res.ok) { setRefreshError(json.error ?? 'Refresh failed'); return }
      const now = json.last_verified_at as string
      setProperties(prev => prev.map(p => p.id === id ? { ...p, last_verified_at: now } : p))
      setActiveCount(prev => {
        // recalculate after update
        return prev // will re-derive on next render via freshness
      })
    } catch {
      setRefreshError('Network error. Please try again.')
    } finally {
      setRefreshing(null)
    }
  }

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data } = await supabase
        .from('properties')
        .select('id,title,property_type,listing_type,city,locality,price,price_unit,is_available,last_verified_at,created_at,photos')
        .eq('owner_id', session.user.id)
        .order('created_at', { ascending: false })

      const rows = data ?? []
      setProperties(rows)
      setActiveCount(rows.filter(p => {
        if (!p.is_available) return false
        if (!p.last_verified_at) return false
        return (Date.now() - new Date(p.last_verified_at).getTime()) / 86400000 <= 30
      }).length)
      setLoading(false)
    }
    load()
  }, [supabase, router])

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: "'Sora', sans-serif", color: 'var(--white)' }}>
      <style>{`
        :root{--bg:#0a0a0a;--bg2:#111111;--bg3:#161616;--bg4:#1e1e1e;--border:rgba(255,255,255,0.07);--border2:rgba(255,255,255,0.12);--white:#ffffff;--off:rgba(255,255,255,0.85);--muted:rgba(255,255,255,0.38);--red:#c0392b;--red2:#a93226;--red-bg:rgba(192,57,43,0.08);--gold:#e8a908;--gold-bg:rgba(232,169,8,0.08);--teal:#3ba88f;--teal-bg:rgba(59,168,143,0.08);}
        body{background:var(--bg);margin:0;padding:0;}
        body::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse 60% 50% at 20% 0%,rgba(139,0,0,0.08) 0%,transparent 60%);pointer-events:none;z-index:0;}
        .dn{position:sticky;top:0;z-index:50;background:rgba(10,10,10,0.92);backdrop-filter:blur(20px);border-bottom:1px solid var(--border);padding:0 24px;height:58px;display:flex;align-items:center;justify-content:space-between;}
        .dn-left{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
        .dn-logo{font-size:14px;font-weight:700;color:var(--white);text-decoration:none;}
        .dn-sep{color:var(--muted);font-size:12px;}
        .dn-crumb{font-size:13px;color:var(--muted);text-decoration:none;transition:color 0.15s;}
        .dn-crumb:hover{color:var(--off);}
        .dn-tag{font-size:11.5px;font-weight:600;color:var(--red);background:var(--red-bg);border:1px solid rgba(192,57,43,0.25);padding:3px 10px;border-radius:999px;}
        .dn-back{font-size:13px;color:var(--muted);text-decoration:none;transition:color 0.15s;}
        .dn-back:hover{color:var(--off);}
        .dw{position:relative;z-index:1;max-width:960px;margin:0 auto;padding:48px 24px 80px;}
        .dw-head{margin-bottom:36px;}
        .dw-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:10.5px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--red);background:var(--red-bg);border:1px solid rgba(192,57,43,0.2);padding:5px 13px;border-radius:999px;margin-bottom:16px;}
        .dw-title{font-size:clamp(24px,3.8vw,34px);font-weight:800;line-height:1.15;letter-spacing:-0.025em;color:var(--white);margin-bottom:8px;}
        .dw-sub{font-size:14px;color:var(--muted);line-height:1.6;max-width:480px;}
        .dw-earlybar{display:flex;align-items:center;gap:10px;background:var(--gold-bg);border:1px solid rgba(232,169,8,0.18);border-radius:12px;padding:10px 16px;margin-bottom:36px;}
        .dw-earlybar-dot{width:7px;height:7px;border-radius:50%;background:var(--gold);flex-shrink:0;}
        .dw-earlybar-text{font-size:12.5px;color:rgba(232,169,8,0.85);line-height:1.5;}
        .dw-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:36px;}
        .dw-stat{background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:18px 20px;}
        .dw-stat-val{font-size:26px;font-weight:800;letter-spacing:-0.04em;color:var(--white);margin-bottom:4px;}
        .dw-stat-label{font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--muted);}
        .dw-stat-note{font-size:10.5px;color:rgba(255,255,255,0.2);margin-top:6px;}
        .dw-add{background:var(--bg2);border:1px solid rgba(192,57,43,0.3);border-radius:16px;padding:28px 28px;display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:36px;cursor:pointer;text-decoration:none;transition:border-color 0.15s;}
        .dw-add:hover{border-color:rgba(192,57,43,0.5);background:rgba(192,57,43,0.04);}
        .dw-add-left{display:flex;align-items:center;gap:16px;}
        .dw-add-icon{width:44px;height:44px;background:var(--red-bg);border:1px solid rgba(192,57,43,0.25);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}
        .dw-add-title{font-size:16px;font-weight:700;color:var(--white);margin-bottom:3px;}
        .dw-add-desc{font-size:13px;color:var(--muted);}
        .dw-add-cta{font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--red);background:var(--red-bg);border:1px solid rgba(192,57,43,0.25);padding:8px 18px;border-radius:8px;white-space:nowrap;flex-shrink:0;}
        .dw-section-label{font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:14px;padding-left:2px;}
        .dw-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;margin-bottom:36px;}
        .dw-card{background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:22px 20px;display:flex;flex-direction:column;gap:10px;cursor:not-allowed;transition:all 0.15s;position:relative;}
        .dw-card:hover{border-color:var(--border2);background:var(--bg3);}
        .dw-card-badge{position:absolute;top:12px;right:12px;font-size:9px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:rgba(255,255,255,0.2);background:var(--bg3);border:1px solid var(--border);padding:2px 7px;border-radius:999px;}
        .dw-card-icon{font-size:24px;line-height:1;}
        .dw-card-title{font-size:14px;font-weight:600;color:var(--off);}
        .dw-card-desc{font-size:12px;color:var(--muted);line-height:1.55;}
        .dw-pricing{background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:28px 28px;margin-bottom:28px;}
        .dw-pricing-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:20px;}
        .dw-pricing-title{font-size:15px;font-weight:700;color:var(--white);margin-bottom:4px;}
        .dw-pricing-sub{font-size:12.5px;color:var(--muted);line-height:1.55;}
        .dw-pricing-badge{font-size:10px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:var(--teal);background:var(--teal-bg);border:1px solid rgba(59,168,143,0.2);padding:3px 10px;border-radius:999px;white-space:nowrap;flex-shrink:0;}
        .dw-plans{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
        .dw-plan{background:var(--bg3);border:1px solid var(--border);border-radius:12px;padding:18px 16px;}
        .dw-plan.featured{border-color:rgba(192,57,43,0.3);background:rgba(192,57,43,0.04);}
        .dw-plan-name{font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted);margin-bottom:8px;}
        .dw-plan.featured .dw-plan-name{color:var(--red);}
        .dw-plan-price{font-size:20px;font-weight:800;letter-spacing:-0.04em;color:var(--white);margin-bottom:2px;}
        .dw-plan-cycle{font-size:11px;color:var(--muted);}
        .dw-plan-features{margin-top:12px;display:flex;flex-direction:column;gap:5px;}
        .dw-plan-feature{font-size:11.5px;color:rgba(255,255,255,0.45);display:flex;align-items:center;gap:6px;}
        .dw-plan-feature::before{content:'·';color:var(--muted);}
        /* MY LISTINGS */
        .ml-list{display:flex;flex-direction:column;gap:12px;margin-bottom:36px;}
        .ml-row{background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:18px 20px;display:grid;grid-template-columns:1fr auto;gap:16px;align-items:start;}
        .ml-title{font-size:15px;font-weight:700;color:var(--white);margin-bottom:4px;letter-spacing:-0.01em;}
        .ml-meta{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:6px;}
        .ml-chip{font-size:10.5px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;padding:3px 9px;border-radius:999px;border:1px solid var(--border);color:var(--muted);background:var(--bg3);}
        .ml-price{font-size:15px;font-weight:700;color:var(--white);text-align:right;white-space:nowrap;}
        .ml-freshness{font-size:11px;font-weight:600;text-align:right;margin-top:4px;}
        .ml-verified{font-size:10.5px;color:rgba(255,255,255,0.2);text-align:right;margin-top:3px;}
        .ml-empty{background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:48px 24px;text-align:center;margin-bottom:36px;}
        .ml-empty-icon{font-size:36px;margin-bottom:12px;opacity:0.4;}
        .ml-empty-title{font-size:16px;font-weight:700;color:var(--off);margin-bottom:6px;}
        .ml-empty-sub{font-size:13px;color:var(--muted);margin-bottom:20px;}
        .ml-empty-btn{display:inline-block;background:var(--red);color:#fff;font-size:13px;font-weight:600;padding:11px 24px;border-radius:10px;text-decoration:none;transition:background 0.15s;}
        .ml-empty-btn:hover{background:var(--red2);}
        .ml-actions{display:flex;flex-direction:column;gap:5px;margin-top:8px;}
        .ml-refresh{font-size:11.5px;font-weight:600;padding:6px 13px;border-radius:8px;border:1px solid var(--border2);background:transparent;color:var(--muted);cursor:pointer;font-family:'Sora',sans-serif;transition:all 0.15s;}
        .ml-refresh:hover:not(:disabled){border-color:rgba(59,168,143,0.4);color:var(--teal);}
        .ml-refresh.urgent{border-color:rgba(232,169,8,0.35);color:var(--gold);}
        .ml-refresh.urgent:hover:not(:disabled){border-color:rgba(232,169,8,0.6);background:rgba(232,169,8,0.06);}
        .ml-refresh:disabled{opacity:0.45;cursor:default;}
        .ml-disable{font-size:11.5px;font-weight:600;padding:6px 13px;border-radius:8px;border:1px solid rgba(192,57,43,0.2);background:transparent;color:rgba(192,57,43,0.6);cursor:pointer;font-family:'Sora',sans-serif;transition:all 0.15s;}
        .ml-disable:hover:not(:disabled){border-color:rgba(192,57,43,0.45);color:var(--red);background:var(--red-bg);}
        .ml-disable:disabled{opacity:0.4;cursor:default;}
        .ml-edit{font-size:11.5px;font-weight:600;padding:6px 13px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:rgba(255,255,255,0.45);cursor:pointer;font-family:'Sora',sans-serif;text-decoration:none;transition:all 0.15s;display:inline-block;}
        .ml-edit:hover{border-color:rgba(255,255,255,0.2);color:var(--off);}
        .ml-err{font-size:11px;color:#e05a4a;margin-top:6px;text-align:right;}
        .skeleton{background:var(--bg3);border-radius:14px;animation:pulse 1.4s ease-in-out infinite;}
        @keyframes pulse{0%,100%{opacity:0.35;}50%{opacity:0.7;}}
        @media(max-width:640px){.dw{padding:36px 16px 60px;}.dw-stats{grid-template-columns:1fr 1fr;}.dw-plans{grid-template-columns:1fr;}.dw-add{flex-direction:column;align-items:flex-start;}.dw-cards{grid-template-columns:1fr 1fr;}.ml-row{grid-template-columns:1fr;}}
      `}</style>

      {/* NAV */}
      <nav className="dn">
        <div className="dn-left">
          <a href="/" className="dn-logo">Yana Nagaland</a>
          <span className="dn-sep">/</span>
          <a href="/real-estate" className="dn-crumb">Real Estate</a>
          <span className="dn-sep">/</span>
          <span className="dn-tag">Owner Dashboard</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          <a href="/account" className="dn-back">👤 My Account</a>
          <a href="/real-estate" className="dn-back">← Listings</a>
        </div>
      </nav>

      <div className="dw">

        {/* HEADER */}
        <div className="dw-head">
          <div className="dw-eyebrow"><span>🏡</span><span>Owner Control Panel</span></div>
          <h1 className="dw-title">Your Property<br />Dashboard</h1>
          <p className="dw-sub">List, manage, and track your land, homes, and rentals across Nagaland.</p>
        </div>

        {/* EARLY ACCESS NOTICE */}
        <div className="dw-earlybar">
          <div className="dw-earlybar-dot" />
          <div className="dw-earlybar-text">
            <strong style={{ color: 'var(--gold)' }}>Early access open.</strong> Listings are live and free. Pricing plans are being finalised.
          </div>
        </div>

        {/* STATS */}
        <div className="dw-stats">
          <div className="dw-stat">
            <div className="dw-stat-val">{loading ? '—' : activeCount}</div>
            <div className="dw-stat-label">My Listings</div>
            <div className="dw-stat-note">Active properties</div>
          </div>
          <div className="dw-stat">
            <div className="dw-stat-val">—</div>
            <div className="dw-stat-label">Total Views</div>
            <div className="dw-stat-note">Coming soon</div>
          </div>
          <div className="dw-stat">
            <div className="dw-stat-val">—</div>
            <div className="dw-stat-label">Leads</div>
            <div className="dw-stat-note">Enquiries received</div>
          </div>
        </div>

        {/* ADD NEW PROPERTY */}
        <a href="/real-estate/dashboard/add-property" className="dw-add">
          <div className="dw-add-left">
            <div className="dw-add-icon">➕</div>
            <div>
              <div className="dw-add-title">Add New Property</div>
              <div className="dw-add-desc">Post land, a house, apartment, or commercial space.</div>
            </div>
          </div>
          <div className="dw-add-cta">Add Property →</div>
        </a>

        {/* MY LISTINGS */}
        <div className="dw-section-label">My Listings</div>

        {loading ? (
          <div className="ml-list">
            {[1,2].map(i => <div key={i} className="skeleton" style={{height:90}} />)}
          </div>
        ) : properties.length === 0 ? (
          <div className="ml-empty">
            <div className="ml-empty-icon">🏘</div>
            <div className="ml-empty-title">No listings yet</div>
            <div className="ml-empty-sub">Your submitted properties will appear here.</div>
            <a href="/real-estate/dashboard/add-property" className="ml-empty-btn">Add Your First Property</a>
          </div>
        ) : (
          <div className="ml-list">
            {properties.map(p => {
              const { label, color } = freshness(p.last_verified_at)
              const loc = [p.locality, p.city].filter(Boolean).join(', ')
              const needsRefresh = label === 'Expiring Soon' || label === 'Expired' || label === 'Unverified'
              const isRefreshing = refreshing === p.id
              const thumb = Array.isArray(p.photos) && p.photos.length > 0 ? p.photos[0] : null
              return (
                <div key={p.id} className="ml-row">
                  <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
                    <div style={{width:62,height:52,borderRadius:8,overflow:'hidden',background:'var(--bg3)',border:'1px solid var(--border)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,opacity:0.5}}>
                      {thumb
                        ? <img src={thumb} alt="" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}} onError={e => { (e.currentTarget as HTMLImageElement).style.display='none'; (e.currentTarget.parentElement as HTMLElement).textContent = p.property_type === 'land' ? '🌿' : '🏠' }} />
                        : (p.property_type === 'land' ? '🌿' : p.property_type === 'apartment' ? '🏢' : p.property_type === 'commercial' ? '🏪' : '🏠')}
                    </div>
                    <div>
                    <div className="ml-title">{p.title}</div>
                    <div style={{fontSize:12.5,color:'var(--muted)',marginTop:2}}>{loc}</div>
                    <div className="ml-meta">
                      <span className="ml-chip">{p.property_type}</span>
                      <span className="ml-chip">{p.listing_type === 'rent' ? 'For Rent' : 'For Sale'}</span>
                      {!p.is_available && <span className="ml-chip" style={{color:'rgba(192,57,43,0.7)',borderColor:'rgba(192,57,43,0.2)'}}>Unavailable</span>}
                    </div>
                  </div></div>
                  <div>
                    <div className="ml-price">{fmt(p.price)}{p.price_unit ? ` / ${p.price_unit}` : ''}</div>
                    <div className="ml-freshness" style={{color}}>{label}</div>
                    <div className="ml-verified">
                      {p.last_verified_at
                        ? `Verified ${new Date(p.last_verified_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}`
                        : 'Not verified'}
                    </div>
                    <div className="ml-actions">
                      <a
                        href={`/real-estate/dashboard/edit/${p.id}`}
                        className="ml-edit"
                      >✏️ Edit</a>
                      <button
                        className={`ml-refresh${needsRefresh ? ' urgent' : ''}`}
                        onClick={() => handleRefresh(p.id)}
                        disabled={isRefreshing || !!refreshing || !!disabling}
                      >
                        {isRefreshing ? 'Refreshing…' : needsRefresh ? '⚡ Refresh Now' : '↻ Refresh'}
                      </button>
                      {p.is_available && (
                        <button
                          className="ml-disable"
                          onClick={() => handleDisable(p.id)}
                          disabled={!!disabling || !!refreshing}
                        >
                          {disabling === p.id ? 'Updating…' : '✕ Mark as Sold / Rented'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            {(refreshError || disableError) && (
              <div style={{fontSize:12,color:'#e05a4a',textAlign:'right',marginTop:-6}}>
                {disableError || refreshError}
              </div>
            )}
          </div>
        )}

        {/* COMING SOON CARDS */}
        <div className="dw-section-label">Coming Soon</div>
        <div className="dw-cards">
          {[
            { icon: '✏️', title: 'Edit Property',        desc: 'Update photos, price, and details anytime.' },
            { icon: '✅', title: 'Mark Sold / Rented',   desc: 'Close a listing once your property is taken.' },
            { icon: '📊', title: 'Listing Analytics',    desc: 'Track views and enquiries per property.' },
          ].map(c => (
            <div key={c.title} className="dw-card">
              <span className="dw-card-badge">Soon</span>
              <div className="dw-card-icon">{c.icon}</div>
              <div className="dw-card-title">{c.title}</div>
              <div className="dw-card-desc">{c.desc}</div>
            </div>
          ))}
        </div>

        {/* PRICING */}
        <div className="dw-section-label">Property Listing Plans</div>
        <div className="dw-pricing">
          <div className="dw-pricing-head">
            <div>
              <div className="dw-pricing-title">Real Estate Pricing</div>
              <div className="dw-pricing-sub">Separate from the main business directory. Plans are being finalised — early listings are free.</div>
            </div>
            <div className="dw-pricing-badge">Coming Soon</div>
          </div>
          <div className="dw-plans">
            <div className="dw-plan">
              <div className="dw-plan-name">Free</div>
              <div className="dw-plan-price">₹0</div>
              <div className="dw-plan-cycle">during early access</div>
              <div className="dw-plan-features">
                <div className="dw-plan-feature">1 active listing</div>
                <div className="dw-plan-feature">Basic detail page</div>
                <div className="dw-plan-feature">Public visibility</div>
              </div>
            </div>
            <div className="dw-plan featured">
              <div className="dw-plan-name">Pro Listing</div>
              <div className="dw-plan-price">TBD</div>
              <div className="dw-plan-cycle">pricing being decided</div>
              <div className="dw-plan-features">
                <div className="dw-plan-feature">Up to 10 photos</div>
                <div className="dw-plan-feature">Featured badge</div>
                <div className="dw-plan-feature">Priority placement</div>
              </div>
            </div>
            <div className="dw-plan">
              <div className="dw-plan-name">Agent / Broker</div>
              <div className="dw-plan-price">TBD</div>
              <div className="dw-plan-cycle">pricing being decided</div>
              <div className="dw-plan-features">
                <div className="dw-plan-feature">Unlimited listings</div>
                <div className="dw-plan-feature">Lead notifications</div>
                <div className="dw-plan-feature">Analytics dashboard</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

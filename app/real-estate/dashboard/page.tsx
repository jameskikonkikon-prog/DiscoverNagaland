'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Toast'

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
  return { label: 'Needs Refresh', color: '#c0392b' }
}

function fmt(price: number) {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)}Cr`
  if (price >= 100000)   return `₹${(price / 100000).toFixed(1)}L`
  return `₹${price.toLocaleString('en-IN')}`
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function RealEstateDashboard() {
  const router = useRouter()
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  )
  const { showToast } = useToast()
  const [loading,    setLoading]    = useState(true)
  const [userName,   setUserName]   = useState('')
  const [properties, setProperties] = useState<Property[]>([])
  const [totalLeads, setTotalLeads] = useState(0)
  const [totalViews, setTotalViews] = useState(0)
  const [refreshing, setRefreshing] = useState<string | null>(null)
  const [disabling,  setDisabling]  = useState<string | null>(null)

  async function handleDisable(id: string) {
    setDisabling(id)
    try {
      const res = await fetch('/api/real-estate', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const json = await res.json()
      if (!res.ok) { showToast(json.error ?? 'Failed to update listing', 'error'); return }
      setProperties(prev => prev.map(p => p.id === id ? { ...p, is_available: false } : p))
      showToast('Listing marked as sold')
    } catch {
      showToast('Network error. Please try again.', 'error')
    } finally {
      setDisabling(null)
    }
  }

  async function handleRefresh(id: string) {
    setRefreshing(id)
    try {
      const res = await fetch('/api/real-estate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const json = await res.json()
      if (!res.ok) { showToast(json.error ?? 'Refresh failed', 'error'); return }
      const now = json.last_verified_at as string
      setProperties(prev => prev.map(p => p.id === id ? { ...p, last_verified_at: now } : p))
      showToast('Listing refreshed!')
    } catch {
      showToast('Network error. Please try again.', 'error')
    } finally {
      setRefreshing(null)
    }
  }

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const meta = session.user.user_metadata
      const name = meta?.full_name ?? meta?.name ?? session.user.email?.split('@')[0] ?? ''
      setUserName(name)

      const { data } = await supabase
        .from('properties')
        .select('id,title,property_type,listing_type,city,locality,price,price_unit,is_available,last_verified_at,created_at,photos')
        .eq('owner_id', session.user.id)
        .order('created_at', { ascending: false })

      const rows = data ?? []
      setProperties(rows)

      if (rows.length > 0) {
        const propIds = rows.map(p => p.id)
        const { data: events } = await supabase
          .from('lead_events')
          .select('event_type')
          .in('property_id', propIds)
        const evRows = events ?? []
        setTotalLeads(evRows.filter((e: { event_type: string }) => e.event_type === 'call' || e.event_type === 'whatsapp').length)
        setTotalViews(evRows.filter((e: { event_type: string }) => e.event_type === 'view').length)
      }

      setLoading(false)
    }
    load()
  }, [supabase, router])

  const firstName = userName ? userName.split(' ')[0] : ''

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: "'Sora', sans-serif", color: 'var(--white)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap');
        :root{
          --bg:#0a0a0a;--bg2:#111111;--bg3:#161616;--bg4:#1e1e1e;
          --border:rgba(255,255,255,0.07);--border2:rgba(255,255,255,0.12);
          --white:#ffffff;--off:rgba(255,255,255,0.85);--muted:rgba(255,255,255,0.38);
          --red:#c0392b;--red2:#a93226;--red-bg:rgba(192,57,43,0.08);
          --gold:#e8a908;--teal:#3ba88f;--teal-bg:rgba(59,168,143,0.08);
        }
        *{box-sizing:border-box;}
        body{background:var(--bg);margin:0;padding:0;}
        body::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse 60% 50% at 20% 0%,rgba(139,0,0,0.07) 0%,transparent 60%);pointer-events:none;z-index:0;}

        /* NAV */
        .dn{position:sticky;top:0;z-index:50;background:rgba(10,10,10,0.92);backdrop-filter:blur(20px);border-bottom:1px solid var(--border);padding:0 24px;height:58px;display:flex;align-items:center;justify-content:space-between;}
        .dn-left{display:flex;align-items:center;gap:8px;}
        .dn-logo{font-size:14px;font-weight:700;color:var(--white);text-decoration:none;}
        .dn-sep{color:var(--muted);font-size:12px;}
        .dn-crumb{font-size:13px;color:var(--muted);text-decoration:none;transition:color 0.15s;}
        .dn-crumb:hover{color:var(--off);}
        .dn-tag{font-size:11.5px;font-weight:600;color:var(--red);background:var(--red-bg);border:1px solid rgba(192,57,43,0.25);padding:3px 10px;border-radius:999px;}
        .dn-back{font-size:13px;color:var(--muted);text-decoration:none;transition:color 0.15s;}
        .dn-back:hover{color:var(--off);}

        /* LAYOUT */
        .dw{position:relative;z-index:1;max-width:1080px;margin:0 auto;padding:32px 16px 80px;}

        /* DESKTOP TWO-COLUMN */
        .dw-body{display:block;}
        .dw-left{margin-bottom:0;}
        .dw-right{}

        /* HEADER */
        .dw-greeting{font-size:24px;font-weight:800;letter-spacing:-0.03em;color:var(--white);margin-bottom:4px;line-height:1.2;}
        .dw-sub{font-size:13px;color:var(--muted);margin-bottom:20px;}

        /* STATS */
        .dw-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px;}
        .dw-stat{background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:16px 14px;}
        .dw-stat-val{font-size:30px;font-weight:800;letter-spacing:-0.05em;color:var(--white);line-height:1;margin-bottom:5px;}
        .dw-stat-label{font-size:11.5px;font-weight:600;color:var(--off);margin-bottom:1px;}
        .dw-stat-note{font-size:10.5px;color:var(--muted);}

        /* ADD BUTTON */
        .dw-addbtn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;background:var(--red);color:#fff;font-size:14px;font-weight:700;padding:13px 20px;border-radius:10px;text-decoration:none;letter-spacing:-0.01em;transition:background 0.15s;margin-bottom:24px;}
        .dw-addbtn:hover{background:var(--red2);}

        /* FREE LAUNCH CARD */
        .dw-launch{background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:16px 18px;margin-top:8px;}
        .dw-launch-label{font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--teal);margin-bottom:6px;}
        .dw-launch-text{font-size:13px;color:var(--off);line-height:1.55;}

        /* SECTION LABEL */
        .dw-sec{font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:12px;padding-left:2px;}

        /* LISTING ROWS */
        .ml-list{display:flex;flex-direction:column;gap:8px;}
        .ml-row{background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:10px;transition:border-color 0.15s;}
        .ml-row:hover{border-color:var(--border2);}
        .ml-top{display:flex;gap:12px;align-items:flex-start;}
        .ml-thumb{width:62px;height:62px;border-radius:9px;overflow:hidden;background:var(--bg3);border:1px solid var(--border);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:22px;opacity:0.55;}
        .ml-thumb img{width:100%;height:100%;object-fit:cover;display:block;}
        .ml-info{flex:1;min-width:0;}
        .ml-title{font-size:14px;font-weight:700;color:var(--white);margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}
        .ml-loc{font-size:12px;color:var(--muted);margin-bottom:6px;}
        .ml-badges{display:flex;flex-wrap:wrap;gap:5px;}
        .ml-badge{font-size:10px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;padding:2px 8px;border-radius:999px;border:1px solid var(--border);color:var(--muted);background:var(--bg3);}
        .ml-badge-unavail{border-color:rgba(192,57,43,0.2);color:rgba(192,57,43,0.65);}
        .ml-right{display:flex;flex-direction:column;align-items:flex-end;gap:3px;flex-shrink:0;min-width:0;}
        .ml-price{font-size:13.5px;font-weight:700;color:var(--white);white-space:nowrap;}
        .ml-fresh{font-size:10.5px;font-weight:600;white-space:nowrap;}
        .ml-divider{height:1px;background:var(--border);}
        .ml-actions{display:flex;gap:6px;flex-wrap:wrap;}
        .ml-btn{font-size:11.5px;font-weight:600;padding:6px 13px;border-radius:8px;cursor:pointer;font-family:'Sora',sans-serif;transition:all 0.15s;text-decoration:none;display:inline-flex;align-items:center;border:1px solid var(--border2);background:transparent;color:var(--muted);}
        .ml-btn:hover:not(:disabled){border-color:rgba(255,255,255,0.22);color:var(--off);}
        .ml-btn-refresh.urgent{border-color:rgba(232,169,8,0.35);color:var(--gold);}
        .ml-btn-refresh.urgent:hover:not(:disabled){border-color:rgba(232,169,8,0.6);background:rgba(232,169,8,0.06);}
        .ml-btn-refresh:hover:not(:disabled){border-color:rgba(59,168,143,0.3);color:var(--teal);}
        .ml-btn-disable{border-color:rgba(192,57,43,0.18);color:rgba(192,57,43,0.55);}
        .ml-btn-disable:hover:not(:disabled){border-color:rgba(192,57,43,0.4);color:var(--red);background:var(--red-bg);}
        .ml-btn:disabled{opacity:0.4;cursor:default;}

        /* EMPTY */
        .ml-empty{background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:48px 24px;text-align:center;}
        .ml-empty-icon{font-size:34px;margin-bottom:12px;opacity:0.35;}
        .ml-empty-title{font-size:15px;font-weight:700;color:var(--off);margin-bottom:5px;}
        .ml-empty-sub{font-size:13px;color:var(--muted);margin-bottom:20px;}
        .ml-empty-btn{display:inline-block;background:var(--red);color:#fff;font-size:13px;font-weight:600;padding:11px 24px;border-radius:9px;text-decoration:none;}

        /* SKELETON */
        .skeleton{background:var(--bg3);border-radius:14px;animation:pulse 1.4s ease-in-out infinite;}
        @keyframes pulse{0%,100%{opacity:0.3;}50%{opacity:0.65;}}

        /* MOBILE */
        @media(max-width:640px){
          .dn{display:none;}
          .dw{padding:24px 14px 64px;}
          .dw-greeting{font-size:20px;}
          .dw-stats{grid-template-columns:1fr 1fr;}
          .dw-stats .dw-stat:last-child{grid-column:1/-1;}
          .dw-stat-val{font-size:26px;}
        }

        /* DESKTOP */
        @media(min-width:900px){
          .dw{padding:48px 40px 80px;}
          .dw-body{display:grid;grid-template-columns:300px 1fr;gap:40px;align-items:start;}
          .dw-left{position:sticky;top:80px;}
          .dw-addbtn{margin-bottom:16px;}
          .dw-stats{grid-template-columns:1fr;gap:8px;}
          .dw-stat{padding:18px 16px;}
        }
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/account" className="dn-back">👤 My Account</a>
          <a href="/real-estate" className="dn-back">← Listings</a>
        </div>
      </nav>

      <div className="dw">
        <div className="dw-body">

          {/* LEFT COLUMN */}
          <div className="dw-left">
            <div className="dw-greeting">
              {loading ? greeting() : `${greeting()}${firstName ? `, ${firstName}` : ''}`}
            </div>
            <div className="dw-sub">Manage your property listings</div>

            {/* STATS */}
            <div className="dw-stats">
              <div className="dw-stat">
                <div className="dw-stat-val">{loading ? '—' : properties.length}</div>
                <div className="dw-stat-label">My Listings</div>
                <div className="dw-stat-note">Properties posted</div>
              </div>
              <div className="dw-stat">
                <div className="dw-stat-val">{loading ? '—' : totalLeads}</div>
                <div className="dw-stat-label">Total Leads</div>
                <div className="dw-stat-note">Calls + WhatsApp</div>
              </div>
              <div className="dw-stat">
                <div className="dw-stat-val">{loading ? '—' : totalViews}</div>
                <div className="dw-stat-label">Listing Views</div>
                <div className="dw-stat-note">All time</div>
              </div>
            </div>

            {/* ADD BUTTON */}
            <a href="/real-estate/dashboard/add-property" className="dw-addbtn">
              + Add New Property
            </a>

            {/* FREE LAUNCH CARD */}
            <div className="dw-launch">
              <div className="dw-launch-label">Free during launch</div>
              <div className="dw-launch-text">
                Listings are free during our launch period. Pricing will be introduced soon.
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN — LISTINGS */}
          <div className="dw-right">
            <div className="dw-sec">My Listings</div>

            {loading ? (
              <div className="ml-list">
                {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 110 }} />)}
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
                  const { label: freshLabel, color: freshColor } = freshness(p.last_verified_at)
                  const loc = [p.locality, p.city].filter(Boolean).join(', ')
                  const needsRefresh = freshLabel === 'Expiring Soon' || freshLabel === 'Needs Refresh' || freshLabel === 'Unverified'
                  const isRefreshing = refreshing === p.id
                  const isDisabling = disabling === p.id
                  const thumb = Array.isArray(p.photos) && p.photos.length > 0 ? p.photos[0] : null
                  const emoji = p.property_type === 'land' ? '🌿' : p.property_type === 'apartment' ? '🏢' : p.property_type === 'commercial' ? '🏪' : '🏠'
                  return (
                    <div key={p.id} className="ml-row">
                      <div className="ml-top">
                        <div className="ml-thumb">
                          {thumb
                            ? <img src={thumb} alt="" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.parentElement as HTMLElement).textContent = emoji }} />
                            : emoji}
                        </div>
                        <div className="ml-info">
                          <div className="ml-title">{p.title}</div>
                          {loc && <div className="ml-loc">{loc}</div>}
                          <div className="ml-badges">
                            <span className="ml-badge">{p.property_type}</span>
                            <span className="ml-badge">{p.listing_type === 'rent' ? 'For Rent' : 'For Sale'}</span>
                            {!p.is_available && <span className="ml-badge ml-badge-unavail">Sold / Rented</span>}
                          </div>
                        </div>
                        <div className="ml-right">
                          <div className="ml-price">{fmt(p.price)}{p.price_unit ? ` / ${p.price_unit}` : ''}</div>
                          <div className="ml-fresh" style={{ color: freshColor }}>{freshLabel}</div>
                        </div>
                      </div>
                      <div className="ml-divider" />
                      <div className="ml-actions">
                        <a href={`/real-estate/dashboard/edit/${p.id}`} className="ml-btn">✏ Edit</a>
                        <button
                          className={`ml-btn ml-btn-refresh${needsRefresh ? ' urgent' : ''}`}
                          onClick={() => handleRefresh(p.id)}
                          disabled={isRefreshing || !!refreshing || !!disabling}
                        >
                          {isRefreshing ? 'Refreshing…' : needsRefresh ? '⚡ Refresh Now' : '↻ Refresh'}
                        </button>
                        {p.is_available && (
                          <button
                            className="ml-btn ml-btn-disable"
                            onClick={() => handleDisable(p.id)}
                            disabled={!!disabling || !!refreshing}
                          >
                            {isDisabling ? 'Updating…' : '✕ Mark Sold / Rented'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

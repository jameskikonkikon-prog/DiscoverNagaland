'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import MobileBottomNav from '@/components/MobileBottomNav'

export default function AccountPage() {
  const router = useRouter()
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  )

  const [loading, setLoading]       = useState(true)
  const [email, setEmail]           = useState('')
  const [bizCount, setBizCount]     = useState(0)
  const [propCount, setPropCount]   = useState(0)
  const [savedCount, setSavedCount] = useState(0)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      setEmail(session.user.email ?? '')

      const uid = session.user.id

      const [{ count: bc }, { count: pc }] = await Promise.all([
        supabase.from('businesses').select('id', { count: 'exact', head: true }).eq('owner_id', uid).eq('is_active', true),
        supabase.from('properties').select('id', { count: 'exact', head: true }).eq('owner_id', uid).eq('is_available', true),
      ])

      setBizCount(bc ?? 0)
      setPropCount(pc ?? 0)

      try {
        const res = await fetch('/api/saved')
        if (res.ok) {
          const data = await res.json()
          setSavedCount((data.saved ?? []).length)
        }
      } catch { /* ignore */ }

      setLoading(false)
    }
    load()
  }, [supabase, router])

  const ownsNeither = !loading && bizCount === 0 && propCount === 0

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: "'Sora', sans-serif", color: 'var(--white)' }}>
      <style>{`
        :root{--bg:#0a0a0a;--bg2:#111111;--bg3:#161616;--bg4:#1e1e1e;--border:rgba(255,255,255,0.07);--border2:rgba(255,255,255,0.12);--white:#ffffff;--off:rgba(255,255,255,0.85);--muted:rgba(255,255,255,0.38);--red:#c0392b;--red2:#a93226;--red-bg:rgba(192,57,43,0.08);--teal:#3ba88f;--teal-bg:rgba(59,168,143,0.08);}
        body{background:var(--bg);margin:0;padding:0;}
        body::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse 60% 50% at 20% 0%,rgba(139,0,0,0.07) 0%,transparent 60%);pointer-events:none;z-index:0;}
        .nav{position:sticky;top:0;z-index:50;background:rgba(10,10,10,0.92);backdrop-filter:blur(20px);border-bottom:1px solid var(--border);padding:0 24px;height:58px;display:flex;align-items:center;justify-content:space-between;}
        .nav-left{display:flex;align-items:center;gap:8px;}
        .nav-logo{font-size:14px;font-weight:700;color:var(--white);text-decoration:none;}
        .nav-sep{color:var(--muted);font-size:12px;}
        .nav-tag{font-size:11.5px;font-weight:600;color:var(--red);background:var(--red-bg);border:1px solid rgba(192,57,43,0.25);padding:3px 10px;border-radius:999px;}
        .nav-signout{font-size:12px;font-weight:600;color:var(--muted);background:transparent;border:1px solid var(--border2);border-radius:8px;padding:6px 14px;cursor:pointer;font-family:'Sora',sans-serif;transition:color 0.15s,border-color 0.15s;}
        .nav-signout:hover{color:var(--off);border-color:rgba(255,255,255,0.22);}
        .wrap{position:relative;z-index:1;max-width:720px;margin:0 auto;padding:52px 24px 80px;}
        .eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:10.5px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--red);background:var(--red-bg);border:1px solid rgba(192,57,43,0.2);padding:5px 13px;border-radius:999px;margin-bottom:16px;}
        .title{font-size:clamp(24px,4vw,32px);font-weight:800;letter-spacing:-0.03em;color:var(--white);margin-bottom:6px;}
        .sub{font-size:13.5px;color:var(--muted);margin-bottom:44px;line-height:1.6;}
        .cards{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
        .card{background:var(--bg2);border:1px solid var(--border);border-radius:18px;padding:28px 24px;display:flex;flex-direction:column;gap:16px;transition:border-color 0.15s;}
        .card.active{border-color:rgba(192,57,43,0.3);}
        .card.teal{border-color:rgba(59,168,143,0.2);}
        .card-icon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;}
        .card-icon.red{background:var(--red-bg);border:1px solid rgba(192,57,43,0.2);}
        .card-icon.teal{background:var(--teal-bg);border:1px solid rgba(59,168,143,0.18);}
        .card-label{font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;}
        .card-label.red{color:var(--red);}
        .card-label.teal{color:var(--teal);}
        .card-title{font-size:17px;font-weight:700;color:var(--white);letter-spacing:-0.02em;}
        .card-desc{font-size:13px;color:var(--muted);line-height:1.55;flex:1;}
        .card-count{font-size:11px;font-weight:600;color:rgba(255,255,255,0.3);margin-top:4px;}
        .card-btn{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;padding:10px 20px;border-radius:9px;text-decoration:none;transition:all 0.15s;border:none;cursor:pointer;font-family:'Sora',sans-serif;}
        .card-btn.red{background:var(--red);color:#fff;}
        .card-btn.red:hover{background:var(--red2);}
        .card-btn.teal{background:var(--teal-bg);color:var(--teal);border:1px solid rgba(59,168,143,0.25);}
        .card-btn.teal:hover{background:rgba(59,168,143,0.14);}
        .card-btn.ghost{background:var(--bg3);color:var(--off);border:1px solid var(--border2);}
        .card-btn.ghost:hover{border-color:rgba(255,255,255,0.22);}
        .divider{height:1px;background:var(--border);margin:44px 0 36px;}
        .empty-notice{background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:28px 24px;text-align:center;}
        .empty-title{font-size:15px;font-weight:700;color:var(--off);margin-bottom:6px;}
        .empty-sub{font-size:13px;color:var(--muted);line-height:1.6;margin-bottom:20px;}
        .empty-btns{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;}
        .skeleton{background:var(--bg3);border-radius:8px;animation:pulse 1.5s ease-in-out infinite;}
        @keyframes pulse{0%,100%{opacity:0.4;}50%{opacity:0.8;}}
        /* SAVED CARD (customer hero) */
        .saved-card{display:flex;align-items:center;justify-content:space-between;background:var(--bg2);border:1px solid rgba(192,57,43,0.2);border-radius:16px;padding:20px 20px;text-decoration:none;color:inherit;transition:border-color 0.15s;margin-bottom:16px;}
        .saved-card:hover{border-color:rgba(192,57,43,0.4);}
        .saved-card-left{display:flex;align-items:center;gap:14px;}
        .saved-card-icon{font-size:26px;width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:var(--red-bg);border:1px solid rgba(192,57,43,0.2);border-radius:12px;}
        .saved-card-title{font-size:16px;font-weight:700;color:var(--white);margin-bottom:3px;}
        .saved-card-sub{font-size:12px;color:var(--muted);}
        .saved-card-arrow{font-size:18px;color:var(--red);}
        /* CUSTOMER DISCOVER */
        .cust-discover{margin-bottom:16px;}
        .cust-discover-title{font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:12px;}
        .cust-discover-links{display:flex;gap:10px;flex-wrap:wrap;}
        /* OWN A BUSINESS BANNER */
        .own-biz-banner{display:flex;align-items:center;justify-content:space-between;gap:16px;background:var(--bg2);border:1px solid rgba(192,57,43,0.22);border-radius:14px;padding:18px 20px;margin-top:8px;}
        .own-biz-left{display:flex;align-items:center;gap:13px;}
        .own-biz-icon{width:40px;height:40px;border-radius:10px;background:var(--red-bg);border:1px solid rgba(192,57,43,0.22);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}
        .own-biz-title{font-size:14px;font-weight:700;color:var(--white);margin-bottom:2px;}
        .own-biz-sub{font-size:11px;color:var(--muted);line-height:1.5;}
        .own-biz-btn{flex-shrink:0;background:var(--red);color:#fff;font-size:12px;font-weight:700;padding:8px 16px;border-radius:8px;text-decoration:none;white-space:nowrap;font-family:'Sora',sans-serif;transition:opacity 0.15s;}
        .own-biz-btn:hover{opacity:0.85;}
        @media(max-width:520px){.own-biz-banner{flex-direction:column;align-items:flex-start;gap:12px;}.own-biz-btn{align-self:stretch;text-align:center;}}
        /* SAVED STRIP (for owners) */
        .saved-strip{display:flex;align-items:center;justify-content:space-between;background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:14px 18px;margin-top:16px;text-decoration:none;color:var(--off);font-size:13px;font-weight:600;transition:border-color 0.15s;}
        .saved-strip:hover{border-color:var(--border2);}
        .saved-strip-count{font-size:12px;color:var(--muted);}
        @media(max-width:580px){.cards{grid-template-columns:1fr;}.wrap{padding:36px 16px 60px;}}
      `}</style>

      <nav className="nav">
        <div className="nav-left">
          <a href="/" className="nav-logo">Yana Nagaland</a>
          <span className="nav-sep">/</span>
          <span className="nav-tag">My Account</span>
        </div>
        <button className="nav-signout" onClick={signOut}>Sign out</button>
      </nav>

      <div className="wrap">
        <div className="eyebrow"><span>👤</span><span>{ownsNeither && !loading ? 'My Account' : 'Owner Hub'}</span></div>
        <h1 className="title">My Account</h1>
        <p className="sub">{ownsNeither && !loading ? 'Save businesses and properties, or list your own.' : 'Manage your business listings and real estate properties from one place.'}</p>

        {loading ? (
          <div className="cards">
            <div className="skeleton" style={{ height: 220, borderRadius: 18 }} />
            <div className="skeleton" style={{ height: 220, borderRadius: 18 }} />
          </div>
        ) : ownsNeither ? (
          /* ── CUSTOMER VIEW ── */
          <div>
            <a href="/saved" className="saved-card">
              <div className="saved-card-left">
                <div className="saved-card-icon">🔖</div>
                <div>
                  <div className="saved-card-title">Saved Items</div>
                  <div className="saved-card-sub">{savedCount > 0 ? `${savedCount} saved` : 'Nothing saved yet'}</div>
                </div>
              </div>
              <div className="saved-card-arrow">→</div>
            </a>

            <div className="cust-discover">
              <div className="cust-discover-title">Discover Nagaland</div>
              <div className="cust-discover-links">
                <a href="/search"      className="card-btn red">Browse Businesses</a>
                <a href="/real-estate" className="card-btn teal">View Properties</a>
              </div>
            </div>

            <div className="own-biz-banner">
              <div className="own-biz-left">
                <div className="own-biz-icon">🏪</div>
                <div>
                  <div className="own-biz-title">Own a business?</div>
                  <div className="own-biz-sub">List it on Yana — free to get started, no credit card needed.</div>
                </div>
              </div>
              <a href="/register" className="own-biz-btn">List for free →</a>
            </div>
          </div>
        ) : (
          /* ── OWNER VIEW ── */
          <div>
            <div className="cards">
              {/* Business card */}
              <div className={`card${bizCount > 0 ? ' active' : ''}`}>
                <div className="card-icon red">🏪</div>
                <div>
                  <div className="card-label red">Business Directory</div>
                  <div className="card-title">Business Dashboard</div>
                </div>
                <div className="card-desc">
                  {bizCount > 0
                    ? 'Manage your listings, analytics, and AI tools.'
                    : 'You have no business listings yet.'}
                </div>
                {bizCount > 0 && (
                  <div className="card-count">{bizCount} active listing{bizCount !== 1 ? 's' : ''}</div>
                )}
                {bizCount > 0
                  ? <a href="/dashboard" className="card-btn red">Go to Dashboard →</a>
                  : <a href="/register" className="card-btn ghost">Register a Business</a>
                }
              </div>

              {/* Real estate card */}
              <div className={`card${propCount > 0 ? ' teal' : ''}`}>
                <div className="card-icon teal">🏡</div>
                <div>
                  <div className="card-label teal">Real Estate</div>
                  <div className="card-title">Property Dashboard</div>
                </div>
                <div className="card-desc">
                  {propCount > 0
                    ? 'Manage your property listings across Nagaland.'
                    : 'You have no property listings yet.'}
                </div>
                {propCount > 0 && (
                  <div className="card-count">{propCount} active listing{propCount !== 1 ? 's' : ''}</div>
                )}
                {propCount > 0
                  ? <a href="/real-estate/dashboard" className="card-btn teal">Go to Dashboard →</a>
                  : <a href="/real-estate/dashboard/add-property" className="card-btn ghost">List a Property</a>
                }
              </div>
            </div>

            {/* Saved strip for owners */}
            <a href="/saved" className="saved-strip">
              <span>🔖 Saved Items</span>
              <span className="saved-strip-count">{savedCount > 0 ? `${savedCount} saved` : 'None yet'} →</span>
            </a>
          </div>
        )}

      </div>
      <MobileBottomNav />
    </div>
  )
}

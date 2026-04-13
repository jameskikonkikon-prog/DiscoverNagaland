'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

interface Property {
  id: string
  title: string
  property_type: string
  listing_type: string
  city: string
  locality: string | null
  landmark: string | null
  price: number
  price_unit: string | null
  area: number | null
  area_unit: string | null
  description: string | null
  photos: string[] | null
  posted_by_name: string | null
  phone: string | null
  whatsapp: string | null
  is_available: boolean
  is_featured: boolean
  created_at: string
}

const PROP_TYPES = [
  { icon: '🌿', label: 'Land',       value: 'land'       },
  { icon: '🏠', label: 'House',      value: 'house'      },
  { icon: '🏢', label: 'Apartment',  value: 'apartment'  },
  { icon: '🏪', label: 'Commercial', value: 'commercial' },
  { icon: '🏡', label: 'Villa',      value: 'villa'      },
]

function fmtPrice(price: number, unit: string | null, listingType: string): string {
  let base: string
  if (price >= 10000000) base = `₹${(price / 10000000).toFixed(2)} Cr`
  else if (price >= 100000) base = `₹${(price / 100000).toFixed(1)} L`
  else base = `₹${price.toLocaleString('en-IN')}`
  if (unit && listingType === 'rent') return `${base}/${unit}`
  return base
}

export default function RealEstatePage() {
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  )
  const [mounted,       setMounted]       = useState(false)
  const [userEmail,     setUserEmail]     = useState<string | null>(null)
  const [properties,    setProperties]    = useState<Property[]>([])
  const [loading,       setLoading]       = useState(true)
  const [listingFilter, setListingFilter] = useState<'' | 'sale' | 'rent' | 'land'>('')
  const [typeFilter,    setTypeFilter]    = useState('')
  const [searchQuery,   setSearchQuery]   = useState('')
  const [brokenImgs,    setBrokenImgs]    = useState<Set<string>>(new Set())
  const [searching,     setSearching]     = useState(false)
  const [hasSearched,   setHasSearched]   = useState(false)

  useEffect(() => {
    setMounted(true)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email ?? null)
    })
  }, [])

  useEffect(() => {
    fetch('/api/real-estate')
      .then(r => r.json())
      .then(d => { setProperties(d.properties ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Stats — derived from live data, nothing hardcoded
  const totalProps = properties.length
  const districts  = new Set(properties.map(p => p.city).filter(Boolean)).size
  const propTypes  = new Set(properties.map(p => p.property_type).filter(Boolean)).size

  // Filtering
  const filtered = properties.filter(p => {
    if (listingFilter === 'sale' && p.listing_type !== 'sale') return false
    if (listingFilter === 'rent' && p.listing_type !== 'rent') return false
    if (listingFilter === 'land' && p.property_type?.toLowerCase() !== 'land') return false
    if (typeFilter && p.property_type?.toLowerCase() !== typeFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const match =
        p.title?.toLowerCase().includes(q) ||
        p.city?.toLowerCase().includes(q) ||
        p.locality?.toLowerCase().includes(q) ||
        p.property_type?.toLowerCase().includes(q)
      if (!match) return false
    }
    return true
  })

  const getInitials = (email: string) =>
    email.split('@')[0].slice(0, 2).toUpperCase()

  return (
    <>
      <style>{CSS}</style>
      <div className="re-root">

        {/* ── TOP NAV ──────────────────────────────────────────── */}
        <nav className="re-nav">
          <a href="/" className="re-nav-logo">
            Yana<span>Nagaland</span>
          </a>
          {!mounted ? (
            <span style={{ width: 36, display: 'inline-block' }} />
          ) : userEmail ? (
            <a href="/dashboard" className="re-nav-avatar" title="Dashboard">
              {getInitials(userEmail)}
            </a>
          ) : (
            <a href="/login" className="re-nav-signin">Sign in</a>
          )}
        </nav>

        {/* ── HERO ─────────────────────────────────────────────── */}
        <section className="re-hero">
          <div className="re-container">
            <div className="re-hero-grid">

              {/* LEFT — title, search, filters */}
              <div className="re-hero-left">
                <div className="re-eyebrow">
                  <span className="re-eyebrow-line" />
                  <span>NAGALAND REAL ESTATE</span>
                </div>
                <h1 className="re-hero-title">
                  Find Land, Homes &amp; Rentals in Nagaland
                </h1>
                <p className="re-hero-sub">
                  Buy, sell or rent across all 17 districts.
                </p>

                {/* Search */}
                <div className="re-search-wrap">
                  <div className="re-search-row">
                    <input
                      className="re-search-input"
                      placeholder="Location, type, keyword..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                    />
                    <button
                      className={`re-search-btn${searching ? ' searching' : ''}`}
                      onClick={() => {
                        setSearching(true)
                        setHasSearched(true)
                        setTimeout(() => setSearching(false), 380)
                      }}
                    >
                      {searching ? 'Searching…' : 'Search'}
                    </button>
                  </div>
                  <div className="re-listing-pills">
                    {(['', 'sale', 'rent', 'land'] as const).map((v, i) => (
                      <button
                        key={v}
                        className={`re-pill${listingFilter === v ? ' active' : ''}`}
                        onClick={() => setListingFilter(v)}
                      >
                        {['All', 'For Sale', 'For Rent', 'Land'][i]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Free banner */}
                <div className="re-free-banner">
                  <div className="re-free-banner-left">
                    <span className="re-free-banner-text">🎉 Listings are free — for now</span>
                    <span className="re-free-banner-sub">Pricing will be introduced soon</span>
                  </div>
                  <a href="/real-estate/dashboard" className="re-free-banner-btn">List free →</a>
                </div>
              </div>

              {/* RIGHT — 3 most recent properties + stats (desktop only) */}
              <div className="re-hero-right">
                <div className="re-hr-head">
                  <span className="re-hr-label">Latest listings</span>
                  <a href="#listings" className="re-hr-viewall">View all →</a>
                </div>
                {loading ? (
                  [1,2,3].map(i => <div key={i} className="re-mini-skeleton" />)
                ) : properties.slice(0, 3).map(p => {
                  const hasPhoto = p.photos && p.photos.length > 0 && !brokenImgs.has(p.id)
                  return (
                    <a key={p.id} href={`/real-estate/${p.id}`} className="re-mini-card">
                      <div className="re-mini-photo">
                        {hasPhoto ? (
                          <img
                            src={p.photos![0]}
                            alt={p.title}
                            className="re-mini-img"
                            onError={() => setBrokenImgs(prev => new Set(prev).add(p.id))}
                          />
                        ) : (
                          <div className="re-mini-nophoto">🏡</div>
                        )}
                      </div>
                      <div className="re-mini-body">
                        <div className="re-mini-price">{fmtPrice(p.price, p.price_unit, p.listing_type)}</div>
                        <div className="re-mini-title">{p.title}</div>
                        <div className="re-mini-meta">
                          {p.property_type && <span className="re-mini-type">{p.property_type}</span>}
                          <span className="re-mini-loc">📍 {p.city}</span>
                        </div>
                      </div>
                    </a>
                  )
                })}

                {/* Stats — desktop only, sits at bottom of right column */}
                <div className="re-hero-stats">
                  <div className="re-hero-stat">
                    <div className="re-hero-stat-val">{loading ? '…' : totalProps || '0'}</div>
                    <div className="re-hero-stat-label">Properties listed</div>
                  </div>
                  <div className="re-hero-stat-divider" />
                  <div className="re-hero-stat">
                    <div className="re-hero-stat-val">{loading ? '…' : districts || '0'}</div>
                    <div className="re-hero-stat-label">Districts covered</div>
                  </div>
                  <div className="re-hero-stat-divider" />
                  <div className="re-hero-stat">
                    <div className="re-hero-stat-val">{loading ? '…' : propTypes || '0'}</div>
                    <div className="re-hero-stat-label">Property types</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── PROPERTY TYPE CHIPS (mobile only) ────────────────── */}
        <div className="re-chips-scroll re-mobile-chips">
          <div className="re-chips">
            {PROP_TYPES.map(t => (
              <button
                key={t.value}
                className={`re-chip${typeFilter === t.value ? ' active' : ''}`}
                onClick={() => setTypeFilter(typeFilter === t.value ? '' : t.value)}
              >
                <span className="re-chip-icon">{t.icon}</span>
                <span className="re-chip-label">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── STATS STRIP ──────────────────────────────────────── */}
        <div className="re-stats-wrap">
          <div className="re-container">
            <div className="re-stats">
              <div className="re-stat-box">
                <div className="re-stat-val">{loading ? '…' : totalProps || '0'}</div>
                <div className="re-stat-label">Properties listed</div>
              </div>
              <div className="re-stat-divider" />
              <div className="re-stat-box">
                <div className="re-stat-val">{loading ? '…' : districts || '0'}</div>
                <div className="re-stat-label">Districts covered</div>
              </div>
              <div className="re-stat-divider" />
              <div className="re-stat-box">
                <div className="re-stat-val">{loading ? '…' : propTypes || '0'}</div>
                <div className="re-stat-label">Property types</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RECENT LISTINGS ──────────────────────────────────── */}
        <section className="re-listings" id="listings">
          <div className="re-container">
            <div className="re-listings-head">
              <div className="re-listings-title">Recent Listings</div>
              {!loading && hasSearched && (
                <div className={`re-listings-count${searching ? ' re-count-searching' : ''}`}>
                  {searching ? '…' : `${filtered.length} result${filtered.length !== 1 ? 's' : ''} found`}
                </div>
              )}
              {!loading && !hasSearched && filtered.length > 0 && (
                <div className="re-listings-count">{filtered.length} available</div>
              )}
            </div>

            {loading ? (
              <div className="re-skeletons">
                {[1, 2, 3].map(i => (
                  <div key={i} className="re-skeleton" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="re-empty">
                <div className="re-empty-icon">🏡</div>
                <div className="re-empty-title">No listings yet</div>
                <div className="re-empty-sub">
                  Be the first to list a property in Nagaland.
                </div>
                <a href="/real-estate/dashboard" className="re-cta-btn">
                  List Your Property Free →
                </a>
              </div>
            ) : (
              <div className="re-card-list">
                {filtered.map(p => (
                  <a key={p.id} href={`/real-estate/${p.id}`} className="re-card">
                    <div className="re-card-photo">
                      {p.photos && p.photos.length > 0 && !brokenImgs.has(p.id) ? (
                        <img
                          src={p.photos[0]}
                          alt={p.title}
                          className="re-card-img"
                          onError={() => setBrokenImgs(prev => new Set(prev).add(p.id))}
                        />
                      ) : (
                        <div className="re-card-no-photo">🏡</div>
                      )}
                      <span className={`re-sale-badge${p.listing_type === 'rent' ? ' rent' : ''}`}>
                        {p.listing_type === 'rent' ? 'FOR RENT' : 'FOR SALE'}
                      </span>
                      {p.photos && p.photos.length > 1 && (
                        <span className="re-photo-count">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                          {p.photos.length}
                        </span>
                      )}
                      {p.is_featured && (
                        <span className="re-featured-badge">★ Featured</span>
                      )}
                    </div>
                    <div className="re-card-body">
                      <div className="re-card-price">
                        {fmtPrice(p.price, p.price_unit, p.listing_type)}
                      </div>
                      <div className="re-card-title">{p.title}</div>
                      <div className="re-card-loc">
                        📍 {p.city}{p.locality ? `, ${p.locality}` : ''}
                      </div>
                      {(p.area || p.property_type) && (
                        <div className="re-card-tags">
                          {p.area && (
                            <span className="re-tag">{p.area} {p.area_unit || 'sqft'}</span>
                          )}
                          {p.property_type && (
                            <span className="re-tag">{p.property_type}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── LIST YOUR PROPERTY CTA ───────────────────────────── */}
        <div className="re-container">
          <div className="re-list-cta">
            <div className="re-list-cta-inner">
              <div className="re-list-cta-icon">🏡</div>
              <div>
                <div className="re-list-cta-title">Have a property to sell or rent?</div>
                <div className="re-list-cta-sub">Reach buyers across all 17 districts — free</div>
              </div>
            </div>
            <a href="/real-estate/dashboard" className="re-cta-btn re-cta-btn-desktop">
              List Your Property Free →
            </a>
          </div>
        </div>

        {/* ── FOOTER ───────────────────────────────────────────── */}
        <footer className="re-footer">
          <div className="re-container">
            <div className="re-footer-links">
              <a href="/search"      className="re-footer-link">Directory</a>·
              <a href="/real-estate" className="re-footer-link">Real Estate</a>·
              <a href="/privacy"     className="re-footer-link">Privacy Policy</a>·
              <a href="/terms"       className="re-footer-link">Terms of Service</a>·
              <a href="/refund"      className="re-footer-link">Refund Policy</a>·
              <a href="/contact"     className="re-footer-link">Contact Us</a>·
              <a href="/about"       className="re-footer-link">About</a>
            </div>
            <div className="re-footer-copy">© 2026 Yana Nagaland. All rights reserved.</div>
          </div>
        </footer>

        {/* ── BOTTOM NAV ───────────────────────────────────────── */}
        <nav className="re-bottom-nav">
          <a href="/" className="re-bnav-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span>Home</span>
          </a>
          <a href="/search" className="re-bnav-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <span>Search</span>
          </a>
          <a href="/real-estate" className="re-bnav-item active">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><line x1="9" y1="22" x2="9" y2="12"/><line x1="15" y1="22" x2="15" y2="12"/><line x1="9" y1="12" x2="15" y2="12"/></svg>
            <span>Real Estate</span>
          </a>
          <a href="/dashboard" className="re-bnav-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            <span>Dashboard</span>
          </a>
        </nav>

      </div>
    </>
  )
}

// ── CSS ────────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Playfair+Display:wght@700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --bg:#0a0a0a;--bg2:#111;--bg3:#161616;--bg4:#1e1e1e;
  --border:rgba(255,255,255,0.07);--border2:rgba(255,255,255,0.12);
  --white:#fff;--off:rgba(255,255,255,0.85);--muted:rgba(255,255,255,0.38);
  --red:#c0392b;--red2:#a93226;--red-bg:rgba(192,57,43,0.09);
  --gold:#D4A017;--gold-bg:rgba(212,160,23,0.09);
}
body{background:var(--bg);font-family:'Sora',sans-serif;color:var(--white);-webkit-font-smoothing:antialiased;}
a{text-decoration:none;color:inherit;}
button{border:none;cursor:pointer;font-family:'Sora',sans-serif;}

.re-root{min-height:100vh;background:var(--bg);padding-bottom:80px;}

/* NAV */
.re-nav{position:sticky;top:0;z-index:100;height:54px;display:flex;align-items:center;justify-content:space-between;padding:0 18px;background:rgba(10,10,10,0.94);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid var(--border);}
.re-nav-logo{font-size:16px;font-weight:800;color:var(--white);letter-spacing:-0.3px;}
.re-nav-logo span{color:var(--red);}
.re-nav-signin{font-size:12px;font-weight:700;color:var(--white);border:1.5px solid rgba(255,255,255,0.22);border-radius:8px;padding:6px 14px;transition:border-color 0.15s;}
.re-nav-signin:hover{border-color:rgba(255,255,255,0.45);}
.re-nav-avatar{width:34px;height:34px;border-radius:10px;background:var(--red);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;letter-spacing:0.5px;}

/* HERO */
.re-hero{padding:28px 18px 20px;}
.re-eyebrow{display:flex;align-items:center;gap:8px;margin-bottom:16px;}
.re-eyebrow-line{width:24px;height:2px;background:var(--red);border-radius:2px;flex-shrink:0;}
.re-eyebrow span:last-child{font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:var(--red);}
.re-hero-title{font-family:'Playfair Display',Georgia,serif;font-size:26px;font-weight:700;line-height:1.2;letter-spacing:-0.02em;color:var(--white);margin-bottom:10px;max-width:340px;}
.re-hero-sub{font-size:13px;color:var(--muted);margin-bottom:20px;line-height:1.6;}

/* SEARCH */
.re-search-wrap{margin-bottom:14px;}
.re-search-row{display:flex;gap:8px;margin-bottom:10px;}
.re-search-input{flex:1;background:var(--bg2);border:1px solid var(--border2);border-radius:10px;padding:11px 14px;font-size:13px;color:var(--white);font-family:'Sora',sans-serif;outline:none;transition:border-color 0.15s;}
.re-search-input:focus{border-color:rgba(255,255,255,0.25);}
.re-search-input::placeholder{color:var(--muted);}
.re-search-btn{background:var(--red);color:#fff;font-size:13px;font-weight:700;padding:0 18px;border-radius:10px;white-space:nowrap;transition:background 0.15s;}
.re-search-btn:hover{background:var(--red2);}
.re-search-btn.searching{background:var(--red2);animation:reSearchPulse 0.7s ease-in-out infinite;}
@keyframes reSearchPulse{0%,100%{opacity:1;}50%{opacity:0.65;}}
.re-count-searching{animation:reSearchPulse 0.7s ease-in-out infinite;}
.re-listing-pills{display:flex;gap:7px;flex-wrap:wrap;}
.re-pill{font-size:12px;font-weight:600;padding:6px 14px;border-radius:999px;border:1px solid var(--border);background:transparent;color:var(--muted);transition:all 0.15s;}
.re-pill.active{background:var(--red-bg);border-color:rgba(192,57,43,0.4);color:var(--white);}
.re-pill:hover:not(.active){border-color:var(--border2);color:var(--off);}

/* FREE BANNER */
.re-free-banner{display:flex;align-items:center;justify-content:space-between;gap:10px;background:var(--gold-bg);border:1px solid rgba(212,160,23,0.22);border-radius:12px;padding:12px 14px;margin-top:16px;}
.re-free-banner-left{display:flex;flex-direction:column;gap:2px;}
.re-free-banner-text{font-size:12px;font-weight:700;color:var(--gold);}
.re-free-banner-sub{font-size:10.5px;color:rgba(212,160,23,0.65);}
.re-free-banner-btn{font-size:11.5px;font-weight:700;color:var(--gold);border:1px solid rgba(212,160,23,0.35);border-radius:7px;padding:6px 12px;white-space:nowrap;background:transparent;transition:all 0.15s;}
.re-free-banner-btn:hover{background:rgba(212,160,23,0.08);}

/* Container — full width on mobile, max-width centered on desktop */
.re-container{width:100%;}
/* Hero grid — single col on mobile */
.re-hero-grid{display:block;}
/* Hero right hidden on mobile */
.re-hero-right{display:none;}
/* Desktop right-column stats hidden on mobile */
.re-hero-stats{display:none;}
.re-stats-wrap{}

/* TYPE CHIPS */
.re-chips-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding:18px 0 6px;}
.re-chips-scroll::-webkit-scrollbar{display:none;}
.re-chips{display:flex;gap:8px;padding:0 18px;}
.re-chip{display:flex;align-items:center;gap:6px;padding:9px 16px;border-radius:999px;background:var(--bg2);border:1px solid var(--border);color:var(--off);font-size:12px;font-weight:600;white-space:nowrap;flex-shrink:0;transition:all 0.15s;}
.re-chip.active{background:var(--red-bg);border-color:rgba(192,57,43,0.4);color:var(--white);}
.re-chip:hover:not(.active){border-color:var(--border2);}
.re-chip-icon{font-size:15px;line-height:1;}
.re-chip-label{font-size:12px;}

/* STATS STRIP */
.re-stats{display:flex;align-items:stretch;background:var(--bg2);border-top:1px solid var(--border);border-bottom:1px solid var(--border);margin:16px 0 0;}
.re-stat-box{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:18px 8px;text-align:center;}
.re-stat-val{font-size:24px;font-weight:800;color:var(--white);letter-spacing:-1px;line-height:1;margin-bottom:4px;}
.re-stat-label{font-size:10px;font-weight:500;color:var(--muted);text-transform:uppercase;letter-spacing:0.7px;line-height:1.3;}
.re-stat-divider{width:1px;background:var(--border);flex-shrink:0;}

/* LISTINGS */
.re-listings{padding:24px 18px 0;}
.re-listings-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
.re-listings-title{font-size:16px;font-weight:700;color:var(--white);}
.re-listings-count{font-size:12px;color:var(--muted);}

/* Skeletons */
@keyframes rePulse{0%,100%{opacity:0.15}50%{opacity:0.3}}
.re-skeletons{display:flex;flex-direction:column;gap:14px;}
.re-skeleton{height:180px;border-radius:14px;background:var(--bg2);animation:rePulse 1.6s ease-in-out infinite;}

/* Empty state */
.re-empty{text-align:center;padding:48px 24px;}
.re-empty-icon{font-size:40px;margin-bottom:12px;opacity:0.4;}
.re-empty-title{font-size:17px;font-weight:600;color:var(--off);margin-bottom:6px;}
.re-empty-sub{font-size:13px;color:var(--muted);margin-bottom:20px;line-height:1.6;}

/* Card list */
.re-card-list{display:flex;flex-direction:column;gap:14px;}
.re-card{background:var(--bg2);border:1px solid var(--border);border-radius:14px;overflow:hidden;display:block;transition:border-color 0.15s;}
.re-card:hover{border-color:rgba(192,57,43,0.3);}
.re-card-photo{position:relative;width:100%;height:186px;background:var(--bg3);overflow:hidden;}
.re-card-img{width:100%;height:100%;object-fit:cover;display:block;}
.re-card-no-photo{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:40px;opacity:0.18;}
.re-sale-badge{position:absolute;top:10px;left:10px;font-size:9.5px;font-weight:800;letter-spacing:0.08em;padding:3px 9px;border-radius:6px;background:rgba(192,57,43,0.85);color:#fff;backdrop-filter:blur(4px);}
.re-sale-badge.rent{background:rgba(59,168,143,0.85);}
.re-photo-count{position:absolute;bottom:8px;right:8px;font-size:10px;font-weight:700;color:#fff;background:rgba(0,0,0,0.6);padding:3px 8px;border-radius:6px;display:flex;align-items:center;gap:4px;backdrop-filter:blur(4px);}
.re-featured-badge{position:absolute;top:10px;right:10px;font-size:9.5px;font-weight:700;color:#e8a908;background:rgba(232,169,8,0.15);border:1px solid rgba(232,169,8,0.3);padding:3px 8px;border-radius:6px;backdrop-filter:blur(4px);}
.re-card-body{padding:14px 14px 16px;}
.re-card-price{font-size:20px;font-weight:800;color:var(--white);letter-spacing:-0.5px;margin-bottom:4px;}
.re-card-price-unit{font-size:12px;font-weight:400;color:var(--muted);}
.re-card-title{font-size:14px;font-weight:600;color:var(--off);margin-bottom:5px;line-height:1.4;letter-spacing:-0.01em;}
.re-card-loc{font-size:11.5px;color:var(--muted);margin-bottom:8px;}
.re-card-tags{display:flex;flex-wrap:wrap;gap:5px;}
.re-tag{font-size:10.5px;font-weight:500;color:var(--muted);background:var(--bg3);border:1px solid var(--border);padding:3px 9px;border-radius:6px;text-transform:capitalize;}

/* CTA */
.re-list-cta{margin:28px 18px;background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:24px 20px;text-align:center;}
.re-list-cta-inner{display:block;}
.re-list-cta-icon{font-size:30px;margin-bottom:10px;display:block;}
.re-list-cta-title{font-size:16px;font-weight:700;color:var(--white);margin-bottom:6px;}
.re-list-cta-sub{font-size:12.5px;color:var(--muted);margin-bottom:18px;line-height:1.5;}
.re-cta-btn{display:inline-block;background:var(--red);color:#fff;font-size:13px;font-weight:700;padding:13px 20px;border-radius:10px;border:none;cursor:pointer;font-family:'Sora',sans-serif;transition:background 0.15s;width:100%;}
.re-cta-btn:hover{background:var(--red2);}

/* FOOTER */
.re-footer{padding:20px 18px 16px;border-top:1px solid var(--border);}
.re-footer-links{display:flex;flex-wrap:wrap;gap:4px 6px;font-size:11.5px;margin-bottom:10px;align-items:center;}
.re-footer-link{color:var(--muted);transition:color 0.15s;}
.re-footer-link:hover{color:var(--off);}
.re-footer-copy{font-size:10.5px;color:rgba(255,255,255,0.2);}

/* BOTTOM NAV */
.re-bottom-nav{position:fixed;bottom:0;left:0;right:0;z-index:200;height:64px;background:rgba(6,6,6,0.98);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border-top:1px solid rgba(255,255,255,0.06);display:flex;align-items:flex-end;justify-content:space-around;padding:0 4px;padding-bottom:max(10px,env(safe-area-inset-bottom));}
.re-bnav-item{display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 10px;color:rgba(255,255,255,0.35);font-size:9.5px;font-weight:600;letter-spacing:0.02em;text-decoration:none;transition:color 0.15s;min-width:52px;}
.re-bnav-item svg{opacity:0.5;transition:opacity 0.15s;}
.re-bnav-item.active{color:var(--red);}
.re-bnav-item.active svg{opacity:1;stroke:var(--red);}

/* ── DESKTOP ── */
@media(min-width:768px){
  .re-root{max-width:100%;padding-bottom:0;}

  /* Every section's inner content is constrained + centered */
  .re-container{max-width:1200px;margin:0 auto;padding:0 40px;}

  /* NAV — full width with container-matching padding */
  .re-nav{padding:0 40px;height:58px;}
  .re-nav-logo{font-size:18px;}

  /* HERO — hero section itself is full-width, content inside container */
  .re-hero{padding:0;border-bottom:1px solid var(--border);}
  .re-hero>.re-container{padding-top:60px;padding-bottom:60px;}

  /* Two-column hero grid: 60% left, 40% right */
  .re-hero-grid{
    display:grid;
    grid-template-columns:3fr 2fr;
    gap:48px;
    align-items:start;
  }

  /* Left column */
  .re-hero-title{font-size:40px;line-height:1.12;max-width:100%;letter-spacing:-0.03em;}
  .re-hero-sub{font-size:14px;margin-bottom:22px;}

  /* Right column — show on desktop */
  .re-hero-right{display:flex;flex-direction:column;gap:0;}
  .re-hr-head{
    display:flex;align-items:center;justify-content:space-between;
    margin-bottom:10px;
  }
  .re-hr-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted);}
  .re-hr-viewall{font-size:11px;font-weight:600;color:var(--red);}
  .re-hr-viewall:hover{opacity:0.8;}

  /* Mini property card */
  .re-mini-card{
    display:flex;gap:0;align-items:stretch;
    background:var(--bg2);border:1px solid var(--border);
    border-radius:12px;overflow:hidden;
    text-decoration:none;color:inherit;
    margin-bottom:8px;
    transition:border-color 0.15s;
  }
  .re-mini-card:last-child{margin-bottom:0;}
  .re-mini-card:hover{border-color:rgba(192,57,43,0.35);}
  .re-mini-photo{width:90px;flex-shrink:0;background:var(--bg3);position:relative;}
  .re-mini-img{width:100%;height:100%;object-fit:cover;display:block;}
  .re-mini-nophoto{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:24px;opacity:0.25;}
  .re-mini-body{padding:10px 12px;flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:3px;}
  .re-mini-price{font-size:14px;font-weight:800;letter-spacing:-0.3px;}
  .re-mini-title{font-size:12px;font-weight:600;color:var(--off);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .re-mini-meta{display:flex;align-items:center;gap:6px;}
  .re-mini-type{font-size:10px;font-weight:600;color:var(--muted);background:var(--bg3);border:1px solid var(--border);padding:2px 7px;border-radius:4px;text-transform:capitalize;}
  .re-mini-loc{font-size:10px;color:var(--muted);}
  .re-mini-skeleton{height:72px;border-radius:12px;background:var(--bg2);margin-bottom:8px;animation:rePulse 1.6s ease-in-out infinite;}

  /* Desktop right-column stats strip */
  .re-hero-stats{
    display:flex;align-items:stretch;
    background:var(--bg2);border:1px solid var(--border);border-radius:12px;
    margin-top:10px;overflow:hidden;
  }
  .re-hero-stat{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:14px 8px;text-align:center;}
  .re-hero-stat-val{font-size:22px;font-weight:800;color:var(--white);letter-spacing:-0.5px;line-height:1;margin-bottom:4px;}
  .re-hero-stat-label{font-size:9.5px;font-weight:500;color:var(--muted);text-transform:uppercase;letter-spacing:0.7px;line-height:1.3;}
  .re-hero-stat-divider{width:1px;background:var(--border);flex-shrink:0;}

  /* Mobile chips hidden on desktop */
  .re-mobile-chips{display:none;}

  /* STATS STRIP — hide on desktop (moved into right column) */
  .re-stats-wrap{display:none;}
  .re-stat-box{padding:28px 0;}
  .re-stat-val{font-size:30px;}

  /* LISTINGS */
  .re-listings{padding:0;}
  .re-listings>.re-container{padding-top:40px;padding-bottom:8px;}
  .re-listings-title{font-size:18px;}
  .re-skeletons{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
  .re-skeleton{height:260px;}
  .re-card-list{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
  .re-card-photo{height:196px;}

  /* CTA — horizontal banner */
  .re-list-cta{
    display:flex;align-items:center;justify-content:space-between;gap:24px;
    margin:36px 0;padding:28px 32px;text-align:left;
  }
  .re-list-cta-inner{display:flex;align-items:center;gap:16px;}
  .re-list-cta-icon{font-size:36px;margin-bottom:0;}
  .re-list-cta-title{font-size:18px;}
  .re-list-cta-sub{margin-bottom:0;}
  .re-cta-btn{width:auto;}
  .re-cta-btn-desktop{white-space:nowrap;padding:14px 28px;flex-shrink:0;}

  /* FOOTER */
  .re-footer{padding:0;}
  .re-footer>.re-container{padding-top:28px;padding-bottom:24px;}

  /* Hide mobile bottom nav */
  .re-bottom-nav{display:none;}
}
`

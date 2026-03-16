'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'

interface Property {
  id: string
  title: string
  type: string
  price: string
  location: string
  area: string | null
  bedrooms: number | null
  bathrooms: number | null
  size_sqft: number | null
  description: string | null
  photos: string[] | null
  status: string
  created_at: string
}

const FILTERS = [
  { label: 'All', value: '' },
  { label: 'Land', value: 'land' },
  { label: 'House', value: 'house' },
  { label: 'Apartment', value: 'apartment' },
  { label: 'Commercial', value: 'commercial' },
  { label: 'Rental', value: 'rental' },
]

export default function RealEstatePage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    fetch('/api/real-estate')
      .then(r => r.json())
      .then(d => { setProperties(d.properties ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = filter
    ? properties.filter(p => p.type?.toLowerCase() === filter)
    : properties

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: "'Sora', sans-serif", color: 'var(--white)' }}>
      <style>{`
        :root{--bg:#0a0a0a;--bg2:#111111;--bg3:#161616;--bg4:#1e1e1e;--border:rgba(255,255,255,0.07);--border2:rgba(255,255,255,0.12);--white:#ffffff;--off:rgba(255,255,255,0.85);--muted:rgba(255,255,255,0.38);--red:#c0392b;--red2:#a93226;--red-bg:rgba(192,57,43,0.08);}
        body{background:var(--bg);margin:0;padding:0;}
        body::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse 60% 50% at 20% 0%,rgba(139,0,0,0.09) 0%,transparent 60%),radial-gradient(ellipse 40% 40% at 80% 90%,rgba(192,57,43,0.05) 0%,transparent 60%);pointer-events:none;z-index:0;}
        .re-nav{position:sticky;top:0;z-index:50;background:rgba(10,10,10,0.92);backdrop-filter:blur(20px);border-bottom:1px solid var(--border);padding:0 24px;height:58px;display:flex;align-items:center;justify-content:space-between;}
        .re-nav-left{display:flex;align-items:center;gap:10px;}
        .re-nav-logo{font-size:15px;font-weight:700;color:var(--white);text-decoration:none;}
        .re-nav-sep{color:var(--muted);font-size:13px;margin:0 4px;}
        .re-nav-tag{font-size:12px;font-weight:600;color:var(--red);background:var(--red-bg);border:1px solid rgba(192,57,43,0.25);padding:3px 10px;border-radius:999px;}
        .re-nav-back{font-size:13px;color:var(--muted);text-decoration:none;display:flex;align-items:center;gap:5px;transition:color 0.15s;}
        .re-nav-back:hover{color:var(--off);}
        .re-hero{position:relative;z-index:1;text-align:center;padding:96px 24px 68px;}
        .re-eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:10.5px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:var(--red);background:var(--red-bg);border:1px solid rgba(192,57,43,0.2);padding:6px 16px;border-radius:999px;margin-bottom:32px;}
        .re-hero h1{font-family:'Playfair Display',Georgia,serif;font-size:clamp(40px,7.5vw,76px);font-weight:700;line-height:1.06;letter-spacing:-0.015em;margin-bottom:26px;color:var(--white);}
        .re-hero h1 span{color:var(--red);font-style:italic;}
        .re-hero p{font-family:'Sora',sans-serif;font-size:clamp(15.5px,2.1vw,18px);color:rgba(255,255,255,0.5);max-width:480px;margin:0 auto 44px;line-height:1.82;font-weight:400;letter-spacing:0.008em;}
        .re-hero-cta{display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;}
        .re-btn-primary{background:var(--red);color:#fff;font-size:13.5px;font-weight:600;letter-spacing:0.02em;padding:12px 28px;border-radius:10px;text-decoration:none;border:none;cursor:pointer;font-family:'Sora',sans-serif;transition:background 0.15s;}
        .re-btn-primary:hover{background:var(--red2);}
        .re-btn-ghost{background:transparent;color:rgba(255,255,255,0.7);font-size:13.5px;font-weight:500;letter-spacing:0.01em;padding:12px 24px;border-radius:10px;text-decoration:none;border:1px solid var(--border2);cursor:pointer;font-family:'Sora',sans-serif;transition:all 0.15s;}
        .re-btn-ghost:hover{border-color:rgba(255,255,255,0.25);color:var(--white);}
        .re-cats{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;padding:0 24px 48px;}
        .re-cat-card{display:flex;flex-direction:column;align-items:center;gap:8px;background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:20px 28px;cursor:pointer;text-decoration:none;transition:all 0.15s;min-width:110px;}
        .re-cat-card:hover{border-color:rgba(192,57,43,0.3);background:rgba(192,57,43,0.05);}
        .re-cat-icon{font-size:24px;}
        .re-cat-label{font-size:11.5px;font-weight:600;color:var(--off);letter-spacing:0.02em;}
        .re-section{position:relative;z-index:1;max-width:1100px;margin:0 auto;padding:0 24px 80px;}
        .re-section-title{font-family:'Playfair Display',Georgia,serif;font-size:24px;font-weight:700;color:var(--white);margin-bottom:6px;letter-spacing:-0.01em;line-height:1.2;}
        .re-section-sub{font-size:13.5px;color:var(--muted);margin-bottom:24px;letter-spacing:0.01em;}
        .re-filters{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:28px;}
        .re-filter-btn{font-size:12px;font-weight:600;padding:7px 16px;border-radius:999px;border:1px solid var(--border);background:transparent;color:var(--muted);cursor:pointer;font-family:'Sora',sans-serif;transition:all 0.15s;}
        .re-filter-btn.active{background:var(--red-bg);border-color:rgba(192,57,43,0.35);color:var(--white);}
        .re-filter-btn:hover:not(.active){border-color:var(--border2);color:var(--off);}
        .re-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;}
        .re-card{background:var(--bg2);border:1px solid var(--border);border-radius:16px;overflow:hidden;transition:border-color 0.15s,transform 0.15s;}
        .re-card:hover{border-color:rgba(192,57,43,0.3);transform:translateY(-2px);}
        .re-card-img{width:100%;height:180px;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:36px;color:var(--muted);}
        .re-card-body{padding:16px 18px 18px;}
        .re-card-type{font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--red);margin-bottom:6px;}
        .re-card-title{font-size:15px;font-weight:600;color:var(--white);margin-bottom:5px;line-height:1.45;letter-spacing:-0.01em;}
        .re-card-loc{font-size:12.5px;color:var(--muted);margin-bottom:10px;display:flex;align-items:center;gap:4px;}
        .re-card-price{font-size:17px;font-weight:700;color:var(--white);letter-spacing:-0.02em;}
        .re-card-meta{display:flex;gap:12px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border);}
        .re-card-meta span{font-size:11.5px;color:var(--muted);display:flex;align-items:center;gap:4px;}
        .re-empty{text-align:center;padding:80px 24px;}
        .re-empty-icon{font-size:48px;margin-bottom:16px;opacity:0.4;}
        .re-empty-title{font-size:19px;font-weight:600;color:var(--off);margin-bottom:8px;letter-spacing:-0.02em;}
        .re-empty-sub{font-size:14px;color:var(--muted);max-width:380px;margin:0 auto 28px;}
        .re-divider{height:1px;background:var(--border);margin:0 0 60px;}
        @media(max-width:600px){.re-hero{padding:60px 20px 44px;}.re-section{padding:0 16px 60px;}.re-cats{padding:0 16px 40px;}.re-cat-card{min-width:90px;padding:16px 18px;}}
      `}</style>

      {/* NAV */}
      <nav className="re-nav">
        <div className="re-nav-left">
          <a href="/" className="re-nav-logo">Yana Nagaland</a>
          <span className="re-nav-sep">/</span>
          <span className="re-nav-tag">Real Estate</span>
        </div>
        <a href="/" className="re-nav-back">← Back to directory</a>
      </nav>

      {/* HERO */}
      <section className="re-hero">
        <div className="re-eyebrow">
          <span>🏡</span>
          <span>Nagaland Real Estate</span>
        </div>
        <h1>
          Find Land, Homes &<br />
          <span>Rentals in Nagaland</span>
        </h1>
        <p>
          Browse verified property listings across Dimapur, Kohima, and all 17 districts.
          Buy, sell, or rent — everything in one place.
        </p>
        <div className="re-hero-cta">
          <a href="/real-estate/dashboard" className="re-btn-primary">List Your Property</a>
          <a href="#browse" className="re-btn-ghost">Browse Listings</a>
        </div>
      </section>

      {/* CATEGORY QUICK LINKS */}
      <div className="re-cats">
        {[
          { icon: '🌿', label: 'Land for Sale' },
          { icon: '🏠', label: 'Houses' },
          { icon: '🏢', label: 'Apartments' },
          { icon: '🏪', label: 'Commercial' },
          { icon: '🔑', label: 'Rentals' },
        ].map(c => (
          <a
            key={c.label}
            className="re-cat-card"
            onClick={() => setFilter(c.label === 'Land for Sale' ? 'land' : c.label === 'Houses' ? 'house' : c.label === 'Apartments' ? 'apartment' : c.label === 'Commercial' ? 'commercial' : 'rental')}
            href="#browse"
          >
            <span className="re-cat-icon">{c.icon}</span>
            <span className="re-cat-label">{c.label}</span>
          </a>
        ))}
      </div>

      <div className="re-divider" style={{ maxWidth: 1100, margin: '0 auto 60px' }} />

      {/* BROWSE SECTION */}
      <section className="re-section" id="browse">
        <div className="re-section-title">Browse Properties</div>
        <div className="re-section-sub">
          {filtered.length > 0 ? `${filtered.length} listing${filtered.length !== 1 ? 's' : ''} available` : 'Showing all categories'}
        </div>

        <div className="re-filters">
          {FILTERS.map(f => (
            <button
              key={f.value}
              className={`re-filter-btn${filter === f.value ? ' active' : ''}`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="re-empty">
            <div className="re-empty-icon">⏳</div>
            <div className="re-empty-title">Loading properties…</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="re-empty">
            <div className="re-empty-icon">🏡</div>
            <div className="re-empty-title">No listings yet</div>
            <div className="re-empty-sub">
              Be the first to list your property on Nagaland&apos;s dedicated real estate platform.
            </div>
            <a href="/real-estate/dashboard" className="re-btn-primary">List a Property</a>
          </div>
        ) : (
          <div className="re-grid">
            {filtered.map(p => (
              <div key={p.id} className="re-card">
                <div className="re-card-img">
                  {p.photos && p.photos.length > 0
                    ? <img src={p.photos[0]} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : '🏡'}
                </div>
                <div className="re-card-body">
                  <div className="re-card-type">{p.type || 'Property'}</div>
                  <div className="re-card-title">{p.title}</div>
                  <div className="re-card-loc">📍 {p.location}{p.area ? `, ${p.area}` : ''}</div>
                  <div className="re-card-price">{p.price}</div>
                  {(p.bedrooms || p.bathrooms || p.size_sqft) && (
                    <div className="re-card-meta">
                      {p.bedrooms && <span>🛏 {p.bedrooms} bed</span>}
                      {p.bathrooms && <span>🚿 {p.bathrooms} bath</span>}
                      {p.size_sqft && <span>📐 {p.size_sqft} sqft</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

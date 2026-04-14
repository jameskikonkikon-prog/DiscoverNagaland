'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

interface SavedBusiness {
  id: string
  name: string
  category: string
  city: string
  photos: string[] | null
  phone: string | null
  whatsapp: string | null
  plan: string | null
}

interface SavedProperty {
  id: string
  title: string
  property_type: string
  listing_type: string
  city: string
  locality: string | null
  price: number
  price_unit: string | null
  photos: string[] | null
}

interface SavedItem {
  id: string
  created_at: string
  business_id: string | null
  property_id: string | null
  businesses: SavedBusiness | null
  properties: SavedProperty | null
}

function fmtPrice(price: number, unit: string | null, listingType: string): string {
  let base: string
  if (price >= 10000000) base = `₹${(price / 10000000).toFixed(1)}Cr`
  else if (price >= 100000) base = `₹${(price / 100000).toFixed(1)}L`
  else base = `₹${price.toLocaleString('en-IN')}`
  if (unit && listingType === 'rent') return `${base}/${unit}`
  return base
}

export default function SavedPage() {
  const router = useRouter()
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  )

  const [loading,   setLoading]   = useState(true)
  const [saved,     setSaved]     = useState<SavedItem[]>([])
  const [activeTab, setActiveTab] = useState<'all' | 'businesses' | 'properties'>('all')

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login?redirect=/saved'); return }

      try {
        const res = await fetch('/api/saved')
        if (res.ok) {
          const data = await res.json()
          setSaved(data.saved ?? [])
        }
      } catch { /* network error — show empty */ }

      setLoading(false)
    }
    load()
  }, [supabase, router])

  async function unsave(item: SavedItem) {
    const params = item.business_id
      ? `business_id=${item.business_id}`
      : `property_id=${item.property_id}`
    await fetch(`/api/saved?${params}`, { method: 'DELETE' })
    setSaved(prev => prev.filter(s => s.id !== item.id))
  }

  const businesses = saved.filter(s => s.business_id && s.businesses)
  const properties = saved.filter(s => s.property_id && s.properties)
  const displayed  = activeTab === 'businesses' ? businesses
    : activeTab === 'properties' ? properties
    : saved

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', fontFamily: "'Sora', sans-serif", color: '#f0f0f0' }}>
      <style>{CSS}</style>

      <nav className="sv-nav">
        <div className="sv-nav-left">
          <a href="/" className="sv-logo">Yana Nagaland</a>
          <span className="sv-sep">/</span>
          <span className="sv-tag">Saved</span>
        </div>
        <a href="/account" className="sv-back">My Account →</a>
      </nav>

      <main className="sv-wrap">
        <div className="sv-header">
          <h1 className="sv-title">Saved Items</h1>
          <p className="sv-sub">Your saved businesses and properties in one place.</p>
        </div>

        {!loading && saved.length > 0 && (
          <div className="sv-tabs">
            {(['all', 'businesses', 'properties'] as const).map(tab => (
              <button
                key={tab}
                className={`sv-tab${activeTab === tab ? ' active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'all'          ? `All (${saved.length})`
                  : tab === 'businesses' ? `Businesses (${businesses.length})`
                  :                       `Properties (${properties.length})`}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="sv-list">
            {[1, 2, 3].map(i => <div key={i} className="sv-skeleton" />)}
          </div>
        ) : displayed.length === 0 ? (
          <div className="sv-empty">
            <div className="sv-empty-icon">🔖</div>
            <div className="sv-empty-title">
              {saved.length === 0 ? 'Nothing saved yet' : 'No items in this category'}
            </div>
            <div className="sv-empty-sub">
              {saved.length === 0
                ? 'Tap the heart icon on any business or property listing to save it here.'
                : 'Switch to a different tab to see your other saves.'}
            </div>
            {saved.length === 0 && (
              <div className="sv-empty-links">
                <a href="/search"      className="sv-cta">Browse Businesses →</a>
                <a href="/real-estate" className="sv-cta sv-cta-outline">View Properties →</a>
              </div>
            )}
          </div>
        ) : (
          <div className="sv-list">
            {displayed.map(item => {
              if (item.business_id && item.businesses) {
                const b = item.businesses
                return (
                  <div key={item.id} className="sv-item">
                    <a href={`/business/${b.id}`} className="sv-item-link">
                      <div className="sv-item-photo">
                        {b.photos?.[0]
                          ? <img src={b.photos[0]} alt={b.name} className="sv-item-img" />
                          : <div className="sv-item-no-photo">🏪</div>}
                      </div>
                      <div className="sv-item-body">
                        <div className="sv-item-type">Business</div>
                        <div className="sv-item-title">{b.name}</div>
                        <div className="sv-item-meta">
                          <span className="sv-item-badge">{b.category}</span>
                          <span className="sv-item-loc">📍 {b.city}</span>
                        </div>
                      </div>
                    </a>
                    <button className="sv-unsave" onClick={() => unsave(item)} title="Remove from saved">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                )
              }
              if (item.property_id && item.properties) {
                const p = item.properties
                return (
                  <div key={item.id} className="sv-item">
                    <a href={`/real-estate/${p.id}`} className="sv-item-link">
                      <div className="sv-item-photo">
                        {p.photos?.[0]
                          ? <img src={p.photos[0]} alt={p.title} className="sv-item-img" />
                          : <div className="sv-item-no-photo">🏡</div>}
                      </div>
                      <div className="sv-item-body">
                        <div className="sv-item-type">Property</div>
                        <div className="sv-item-title">{p.title}</div>
                        <div className="sv-item-meta">
                          <span className="sv-item-price">{fmtPrice(p.price, p.price_unit, p.listing_type)}</span>
                          <span className="sv-item-loc">📍 {p.city}{p.locality ? `, ${p.locality}` : ''}</span>
                        </div>
                      </div>
                    </a>
                    <button className="sv-unsave" onClick={() => unsave(item)} title="Remove from saved">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                )
              }
              return null
            })}
          </div>
        )}
      </main>
    </div>
  )
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #0a0a0a; }

.sv-nav { position: sticky; top: 0; z-index: 50; background: rgba(10,10,10,0.92); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.07); padding: 0 24px; height: 58px; display: flex; align-items: center; justify-content: space-between; }
.sv-nav-left { display: flex; align-items: center; gap: 8px; }
.sv-logo { font-size: 14px; font-weight: 700; color: #fff; text-decoration: none; }
.sv-sep { color: rgba(255,255,255,0.25); font-size: 12px; }
.sv-tag { font-size: 11.5px; font-weight: 600; color: #c0392b; background: rgba(192,57,43,0.08); border: 1px solid rgba(192,57,43,0.25); padding: 3px 10px; border-radius: 999px; }
.sv-back { font-size: 13px; color: rgba(255,255,255,0.4); text-decoration: none; transition: color 0.15s; }
.sv-back:hover { color: rgba(255,255,255,0.85); }

.sv-wrap { max-width: 680px; margin: 0 auto; padding: 48px 20px 80px; }

.sv-header { margin-bottom: 28px; }
.sv-title { font-size: clamp(24px, 4vw, 34px); font-weight: 800; letter-spacing: -0.03em; color: #fff; margin-bottom: 8px; }
.sv-sub { font-size: 13px; color: rgba(255,255,255,0.4); }

.sv-tabs { display: flex; gap: 6px; margin-bottom: 24px; flex-wrap: wrap; }
.sv-tab { font-size: 12px; font-weight: 600; padding: 7px 16px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: rgba(255,255,255,0.45); cursor: pointer; transition: all 0.15s; font-family: 'Sora', sans-serif; }
.sv-tab.active { background: rgba(192,57,43,0.1); border-color: rgba(192,57,43,0.35); color: #fff; }
.sv-tab:hover:not(.active) { border-color: rgba(255,255,255,0.2); color: rgba(255,255,255,0.7); }

.sv-list { display: flex; flex-direction: column; gap: 10px; }
.sv-skeleton { height: 80px; border-radius: 14px; background: #111; animation: svPulse 1.4s ease-in-out infinite; }
@keyframes svPulse { 0%,100%{opacity:0.3;} 50%{opacity:0.6;} }

.sv-empty { text-align: center; padding: 64px 24px; }
.sv-empty-icon { font-size: 40px; margin-bottom: 16px; opacity: 0.35; }
.sv-empty-title { font-size: 17px; font-weight: 700; color: rgba(255,255,255,0.85); margin-bottom: 8px; }
.sv-empty-sub { font-size: 13px; color: rgba(255,255,255,0.38); line-height: 1.65; margin-bottom: 24px; max-width: 340px; margin-left: auto; margin-right: auto; }
.sv-empty-links { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
.sv-cta { display: inline-block; background: #c0392b; color: #fff; font-size: 13px; font-weight: 700; padding: 11px 22px; border-radius: 9px; text-decoration: none; transition: background 0.15s; }
.sv-cta:hover { background: #a93226; }
.sv-cta-outline { background: transparent; border: 1.5px solid rgba(255,255,255,0.15); color: rgba(255,255,255,0.7); }
.sv-cta-outline:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.3); color: #fff; }

.sv-item { display: flex; align-items: center; background: #111; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; overflow: hidden; transition: border-color 0.15s; }
.sv-item:hover { border-color: rgba(255,255,255,0.12); }
.sv-item-link { display: flex; flex: 1; align-items: center; gap: 14px; text-decoration: none; color: inherit; padding: 12px 14px; min-width: 0; }
.sv-item-photo { width: 60px; height: 60px; border-radius: 10px; overflow: hidden; background: #1e1e1e; flex-shrink: 0; }
.sv-item-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.sv-item-no-photo { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 22px; opacity: 0.25; }
.sv-item-body { flex: 1; min-width: 0; }
.sv-item-type { font-size: 9.5px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.3); margin-bottom: 3px; }
.sv-item-title { font-size: 14px; font-weight: 700; color: #fff; margin-bottom: 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sv-item-meta { display: flex; align-items: center; gap: 8px; font-size: 11px; color: rgba(255,255,255,0.38); flex-wrap: wrap; }
.sv-item-badge { background: #1e1e1e; border: 1px solid rgba(255,255,255,0.07); padding: 2px 7px; border-radius: 4px; text-transform: capitalize; }
.sv-item-price { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.75); }
.sv-unsave { flex-shrink: 0; width: 44px; background: transparent; border: none; border-left: 1px solid rgba(255,255,255,0.06); color: rgba(255,255,255,0.25); cursor: pointer; align-self: stretch; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
.sv-unsave:hover { color: #c0392b; background: rgba(192,57,43,0.06); }

@media(max-width:500px) {
  .sv-wrap { padding: 36px 14px 64px; }
  .sv-item-link { padding: 10px 12px; gap: 10px; }
  .sv-item-photo { width: 50px; height: 50px; }
}
`

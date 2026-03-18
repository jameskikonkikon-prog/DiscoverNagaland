'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getServiceClient } from '@/lib/supabase'

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
  area: string | null
  area_unit: string | null
  description: string | null
  photos: string[] | null
  posted_by_name: string | null
  phone: string | null
  whatsapp: string | null
  is_available: boolean
  last_verified_at: string | null
}

function fmt(price: number) {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)}Cr`
  if (price >= 100000)   return `₹${(price / 100000).toFixed(2)}L`
  return `₹${price.toLocaleString('en-IN')}`
}

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [mainImg, setMainImg]   = useState(0)
  const [brokenImgs, setBrokenImgs] = useState<Set<number>>(new Set())

  useEffect(() => {
    async function load() {
      // Use fetch so this works client-side without exposing service key
      const res = await fetch(`/api/real-estate/${id}`)
      if (!res.ok) { setNotFound(true); setLoading(false); return }
      const json = await res.json()
      if (!json.property) { setNotFound(true); setLoading(false); return }
      setProperty(json.property)
      setLoading(false)
    }
    load()
  }, [id])

  const photos = (property?.photos ?? []).filter(Boolean)

  return (
    <div style={{background:'#0a0a0a',minHeight:'100vh',fontFamily:"'Sora',sans-serif",color:'#fff'}}>
      <style>{`
        :root{--bg:#0a0a0a;--bg2:#111;--bg3:#161616;--border:rgba(255,255,255,0.07);--border2:rgba(255,255,255,0.12);--muted:rgba(255,255,255,0.38);--off:rgba(255,255,255,0.85);--red:#c0392b;--red2:#a93226;--red-bg:rgba(192,57,43,0.08);}
        body{background:var(--bg);margin:0;padding:0;}
        .pd-nav{position:sticky;top:0;z-index:50;background:rgba(10,10,10,0.92);backdrop-filter:blur(20px);border-bottom:1px solid var(--border);padding:0 24px;height:58px;display:flex;align-items:center;justify-content:space-between;}
        .pd-nav-logo{font-size:14px;font-weight:700;color:#fff;text-decoration:none;}
        .pd-nav-sep{color:var(--muted);font-size:12px;margin:0 6px;}
        .pd-nav-crumb{font-size:13px;color:var(--muted);text-decoration:none;transition:color 0.15s;}
        .pd-nav-crumb:hover{color:var(--off);}
        .pd-wrap{max-width:860px;margin:0 auto;padding:40px 24px 80px;}
        .pd-gallery{display:grid;gap:8px;margin-bottom:32px;}
        .pd-main-img{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:14px;background:var(--bg3);display:block;}
        .pd-main-placeholder{width:100%;aspect-ratio:16/9;border-radius:14px;background:var(--bg3);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;opacity:0.45;}
        .pd-thumbs{display:flex;gap:8px;overflow-x:auto;padding-bottom:2px;}
        .pd-thumb{width:72px;height:52px;object-fit:cover;border-radius:8px;cursor:pointer;border:2px solid transparent;flex-shrink:0;transition:border-color 0.15s;opacity:0.65;}
        .pd-thumb.active{border-color:var(--red);opacity:1;}
        .pd-thumb:hover{opacity:0.9;}
        .pd-badges{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;}
        .pd-badge-sale{font-size:11px;font-weight:700;letter-spacing:0.05em;color:var(--red);background:var(--red-bg);border:1px solid rgba(192,57,43,0.25);padding:3px 11px;border-radius:999px;}
        .pd-badge-rent{font-size:11px;font-weight:700;letter-spacing:0.05em;color:#3ba88f;background:rgba(59,168,143,0.08);border:1px solid rgba(59,168,143,0.2);padding:3px 11px;border-radius:999px;}
        .pd-badge-type{font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted);background:var(--bg3);border:1px solid var(--border2);padding:3px 11px;border-radius:999px;}
        .pd-title{font-size:clamp(20px,3.5vw,28px);font-weight:800;letter-spacing:-0.025em;line-height:1.25;margin-bottom:8px;}
        .pd-loc{font-size:13.5px;color:var(--muted);margin-bottom:20px;display:flex;align-items:center;gap:5px;}
        .pd-price{font-size:clamp(24px,4vw,34px);font-weight:800;letter-spacing:-0.03em;margin-bottom:4px;}
        .pd-price-unit{font-size:13px;font-weight:400;color:var(--muted);margin-left:6px;}
        .pd-stats{display:flex;gap:20px;flex-wrap:wrap;margin:20px 0;padding:18px 20px;background:var(--bg2);border:1px solid var(--border);border-radius:12px;}
        .pd-stat{display:flex;flex-direction:column;gap:3px;}
        .pd-stat-label{font-size:10.5px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted);}
        .pd-stat-val{font-size:14px;font-weight:600;color:var(--off);}
        .pd-section{margin-bottom:24px;}
        .pd-section-label{font-size:10.5px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:10px;}
        .pd-desc{font-size:14px;color:var(--off);line-height:1.75;white-space:pre-wrap;}
        .pd-contact{background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:22px 24px;}
        .pd-contact-name{font-size:14px;font-weight:700;margin-bottom:16px;}
        .pd-cta-row{display:flex;gap:10px;flex-wrap:wrap;}
        .pd-cta-call{display:inline-flex;align-items:center;gap:7px;background:var(--red);color:#fff;font-size:13px;font-weight:700;padding:11px 22px;border-radius:10px;text-decoration:none;transition:background 0.15s;}
        .pd-cta-call:hover{background:var(--red2);}
        .pd-cta-wa{display:inline-flex;align-items:center;gap:7px;background:rgba(37,211,102,0.1);border:1px solid rgba(37,211,102,0.25);color:#25D366;font-size:13px;font-weight:700;padding:11px 22px;border-radius:10px;text-decoration:none;transition:all 0.15s;}
        .pd-cta-wa:hover{background:rgba(37,211,102,0.18);}
        .pd-center{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;gap:12px;text-align:center;}
        @media(max-width:600px){.pd-wrap{padding:28px 16px 60px;}.pd-stats{gap:14px;}}
      `}</style>

      <nav className="pd-nav">
        <div style={{display:'flex',alignItems:'center'}}>
          <a href="/" className="pd-nav-logo">Yana Nagaland</a>
          <span className="pd-nav-sep">/</span>
          <a href="/real-estate" className="pd-nav-crumb">Real Estate</a>
          {property && <><span className="pd-nav-sep">/</span><span style={{fontSize:13,color:'rgba(255,255,255,0.5)'}}>{property.title.length > 28 ? property.title.slice(0,28)+'…' : property.title}</span></>}
        </div>
        <a href="/real-estate" className="pd-nav-crumb">← All Listings</a>
      </nav>

      {loading ? (
        <div className="pd-center pd-wrap" style={{color:'var(--muted)',fontSize:14}}>Loading…</div>
      ) : notFound ? (
        <div className="pd-center pd-wrap">
          <div style={{fontSize:40}}>🏚️</div>
          <div style={{fontSize:17,fontWeight:700}}>Listing not found</div>
          <div style={{fontSize:13,color:'var(--muted)'}}>This property may have been removed or is no longer available.</div>
          <a href="/real-estate" style={{marginTop:8,fontSize:13,color:'var(--red)'}}>← Browse all listings</a>
        </div>
      ) : property && (
        <div className="pd-wrap">

          {/* GALLERY */}
          {photos.length > 0 ? (
            <div className="pd-gallery">
              {brokenImgs.has(mainImg) ? (
                <div className="pd-main-placeholder"><span style={{fontSize:40}}>🏠</span><span style={{fontSize:13,color:'var(--muted)'}}>Photo unavailable</span></div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photos[mainImg]}
                  alt={property.title}
                  className="pd-main-img"
                  onError={() => setBrokenImgs(prev => new Set(prev).add(mainImg))}
                />
              )}
              {photos.length > 1 && (
                <div className="pd-thumbs">
                  {photos.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={url}
                      src={url}
                      alt={`Photo ${i+1}`}
                      className={`pd-thumb${mainImg === i ? ' active' : ''}`}
                      onClick={() => { setMainImg(i); setBrokenImgs(prev => { const n = new Set(prev); n.delete(i); return n; }) }}
                      onError={() => setBrokenImgs(prev => new Set(prev).add(i))}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="pd-main-placeholder" style={{marginBottom:32}}>
              <span style={{fontSize:48}}>{property.property_type === 'land' ? '🌿' : property.property_type === 'apartment' ? '🏢' : property.property_type === 'commercial' ? '🏪' : '🏠'}</span>
              <span style={{fontSize:13,color:'var(--muted)'}}>No photos</span>
            </div>
          )}

          {/* BADGES + TITLE */}
          <div className="pd-badges">
            <span className="pd-badge-type">{property.property_type}</span>
            <span className={property.listing_type === 'rent' ? 'pd-badge-rent' : 'pd-badge-sale'}>
              {property.listing_type === 'rent' ? 'For Rent' : 'For Sale'}
            </span>
          </div>
          <h1 className="pd-title">{property.title}</h1>
          <div className="pd-loc">
            📍 {[property.locality, property.city, property.landmark].filter(Boolean).join(' · ')}
          </div>

          {/* PRICE */}
          <div className="pd-price">
            {fmt(property.price)}
            {property.price_unit && <span className="pd-price-unit">/ {property.price_unit}</span>}
          </div>

          {/* STATS */}
          {property.area && (
            <div className="pd-stats">
              <div className="pd-stat">
                <span className="pd-stat-label">Area</span>
                <span className="pd-stat-val">{property.area} {property.area_unit || 'sqft'}</span>
              </div>
            </div>
          )}

          {/* DESCRIPTION */}
          {property.description && (
            <div className="pd-section">
              <div className="pd-section-label">About this property</div>
              <div className="pd-desc">{property.description}</div>
            </div>
          )}

          {/* CONTACT */}
          {(property.phone || property.whatsapp) && (
            <div className="pd-contact">
              {property.posted_by_name && <div className="pd-contact-name">Listed by {property.posted_by_name}</div>}
              <div className="pd-cta-row">
                {property.phone && (
                  <a href={`tel:${property.phone}`} className="pd-cta-call">📞 Call</a>
                )}
                {property.whatsapp && (
                  <a
                    href={`https://wa.me/91${property.whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent(`Hi, I'm interested in your property: ${property.title}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pd-cta-wa"
                  >💬 WhatsApp</a>
                )}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}

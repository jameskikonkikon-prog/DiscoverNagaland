'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';

type Property = {
  id: string;
  owner_id?: string;
  title: string;
  property_type?: string;
  listing_type?: string;
  city?: string;
  locality?: string;
  landmark?: string;
  price?: number;
  price_unit?: string;
  area?: number | string;
  area_unit?: string;
  description?: string;
  photos?: string[];
  posted_by_name?: string;
  phone?: string;
  whatsapp?: string;
  is_available?: boolean;
  is_featured?: boolean;
  created_at?: string;
  last_verified_at?: string;
  // Future DB columns — not yet in schema
  beds?: number;
  baths?: number;
  floor?: string | number;
};

type Props = {
  property: Property;
  isOwner: boolean;
  isLoggedIn: boolean;
};

function formatPrice(price?: number): string | null {
  if (!price) return null;
  if (price >= 10_000_000) {
    const v = price / 10_000_000;
    return `₹${v % 1 === 0 ? v.toFixed(0) : parseFloat(v.toFixed(2)).toString()} Cr`;
  }
  if (price >= 100_000) {
    const v = price / 100_000;
    return `₹${v % 1 === 0 ? v.toFixed(0) : parseFloat(v.toFixed(1)).toString()} L`;
  }
  if (price >= 1000) {
    return `₹${(price / 1000).toFixed(0)}k`;
  }
  return `₹${price.toLocaleString('en-IN')}`;
}

function priceTypeLabel(priceUnit?: string): string {
  if (!priceUnit) return 'Total Price';
  const u = priceUnit.toLowerCase();
  if (u.includes('sqft') || u.includes('sq ft') || u.includes('sq.ft')) return 'Per Sq Ft';
  if (u.includes('month') || u.includes('mo')) return 'Per Month';
  if (u.includes('year') || u.includes('yr')) return 'Per Year';
  if (u.includes('acre')) return 'Per Acre';
  return priceUnit;
}

function getListingBadgeLabel(type?: string): string {
  const t = (type || '').toLowerCase();
  if (t.includes('rent')) return 'FOR RENT';
  if (t.includes('sale')) return 'FOR SALE';
  return (type || '').toUpperCase();
}

function isRentType(type?: string): boolean {
  return (type || '').toLowerCase().includes('rent');
}

export default function PropertyPageClient({ property, isOwner, isLoggedIn }: Props) {
  const [failedPhotos, setFailedPhotos] = useState<Set<number>>(new Set());
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  const handlePhotoError = useCallback((index: number) => {
    setFailedPhotos(prev => new Set(prev).add(index));
  }, []);

  const photos = property.photos?.length ? property.photos : [];
  const validPhotos = photos.filter((_, i) => !failedPhotos.has(i));
  const isRent = isRentType(property.listing_type);
  const badgeLabel = getListingBadgeLabel(property.listing_type);
  const priceLabel = formatPrice(property.price);
  const pTypeLabel = priceTypeLabel(property.price_unit);

  const locationLine = [property.locality, property.city].filter(Boolean).join(', ');
  const mapsQuery = [property.title, property.locality, property.landmark, property.city, 'Nagaland'].filter(Boolean).join(' ');
  const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(mapsQuery)}`;
  const waText = encodeURIComponent(`Hi! I'm interested in your property listed on Yana Nagaland: ${property.title}`);
  const waUrl = property.whatsapp ? `https://wa.me/${property.whatsapp.replace(/\D/g, '')}?text=${waText}` : '';

  const track = (type: 'call' | 'whatsapp') => {
    const data = JSON.stringify({ property_id: property.id, event_type: type });
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', new Blob([data], { type: 'application/json' }));
    } else {
      fetch('/api/track', { method: 'POST', body: data, headers: { 'Content-Type': 'application/json' } }).catch(() => {});
    }
  };

  // Specs — only render boxes with actual data
  const specs: { icon: string; label: string; value: string }[] = [];
  if (property.beds) specs.push({ icon: '🛏', label: 'Beds', value: String(property.beds) });
  if (property.baths) specs.push({ icon: '🚿', label: 'Baths', value: String(property.baths) });
  if (property.area) {
    const areaVal = Number(property.area);
    specs.push({ icon: '📐', label: 'Sqft', value: `${isNaN(areaVal) ? property.area : areaVal.toLocaleString('en-IN')} ${property.area_unit || 'sq ft'}` });
  }
  if (property.floor) specs.push({ icon: '🏗', label: 'Floor', value: String(property.floor) });

  const renderGallery = () => {
    if (validPhotos.length === 0) {
      return (
        <div className="gal-placeholder">
          <span className="gal-icon">🏘️</span>
          <span className="gal-none">No photos yet</span>
        </div>
      );
    }

    return (
      <div className="gal-grid">
        {/* Main photo */}
        <div className="gal-main">
          <img
            src={validPhotos[0]}
            alt={property.title}
            className="gal-img"
            onError={() => handlePhotoError(photos.indexOf(validPhotos[0]))}
          />
        </div>

        {/* Two stacked on right — only if 2+ photos */}
        {validPhotos.length >= 2 && (
          <div className="gal-side">
            <div className="gal-side-item">
              <img
                src={validPhotos[1]}
                alt={`${property.title} 2`}
                className="gal-img"
                onError={() => handlePhotoError(photos.indexOf(validPhotos[1]))}
              />
            </div>
            {validPhotos.length >= 3 ? (
              <div className="gal-side-item">
                <img
                  src={validPhotos[2]}
                  alt={`${property.title} 3`}
                  className="gal-img"
                  onError={() => handlePhotoError(photos.indexOf(validPhotos[2]))}
                />
              </div>
            ) : (
              <div className="gal-side-item gal-side-empty" />
            )}
          </div>
        )}

        {/* FOR SALE / FOR RENT badge */}
        <div className={`gal-badge ${isRent ? 'gal-badge-rent' : 'gal-badge-sale'}`}>
          {badgeLabel}
        </div>

        {/* See all photos */}
        {validPhotos.length >= 3 && (
          <button
            type="button"
            className="gal-see-all"
            onClick={() => setShowAllPhotos(true)}
          >
            See all {validPhotos.length} photos
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <style>{css}</style>
      <div className="pp">

        {/* ── Top bar ── */}
        <nav className="topbar">
          <Link href="/real-estate" className="topbar-back">← Properties</Link>
          <div className="topbar-center">
            {[property.property_type, property.city].filter(Boolean).join(' · ')}
          </div>
          {isLoggedIn ? (
            <Link href="/real-estate/dashboard" className="topbar-action">My Listings</Link>
          ) : (
            <Link href="/real-estate/dashboard" className="topbar-action">List Property</Link>
          )}
        </nav>

        {/* ── Gallery — full width ── */}
        <div className="gal-wrap">
          {renderGallery()}
        </div>

        {/* ── Two-column body on desktop ── */}
        <div className="desktop-body">

          {/* LEFT / MAIN */}
          <div className="desktop-main">

            {/* Property head */}
            <div className="phead">
              {property.property_type && (
                <div className="phead-badge">{property.property_type.toUpperCase()}</div>
              )}
              <div className="phead-title">{property.title}</div>
              {locationLine && (
                <div className="phead-loc">
                  <span className="phead-pin">📍</span>
                  {locationLine}{property.city && !locationLine.includes(property.city) ? `, ${property.city}` : ''}, Nagaland
                </div>
              )}
              {priceLabel && (
                <div className="phead-price-row">
                  <span className="phead-price">{priceLabel}</span>
                  <span className="phead-price-type">{pTypeLabel}</span>
                </div>
              )}
            </div>

            {/* Quick specs strip */}
            {specs.length > 0 && (
              <div className="specs-strip">
                {specs.map(s => (
                  <div key={s.label} className="spec-box">
                    <span className="spec-icon">{s.icon}</span>
                    <span className="spec-val">{s.value}</span>
                    <span className="spec-label">{s.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Contact action icons (mobile only — desktop uses sidebar) */}
            <div className="contact-icons">
              {property.phone && (
                <a href={`tel:${property.phone}`} className="ci-btn" onClick={() => track('call')}>
                  <span className="ci-circle ci-call">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.13 6.13l1.07-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  </span>
                  <span className="ci-label">Call</span>
                </a>
              )}
              {property.whatsapp && (
                <a href={waUrl} target="_blank" rel="noopener noreferrer" className="ci-btn" onClick={() => track('whatsapp')}>
                  <span className="ci-circle ci-wa">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                  </span>
                  <span className="ci-label">WhatsApp</span>
                </a>
              )}
            </div>

            {/* About */}
            {property.description && (
              <div className="section">
                <div className="section-title">About this property</div>
                <div className={descExpanded ? 'about-expanded' : 'about-clamped'}>
                  {property.description}
                </div>
                {!descExpanded && (
                  <button className="read-more" onClick={() => setDescExpanded(true)}>
                    Read more →
                  </button>
                )}
              </div>
            )}

            {/* Property details grid */}
            <div className="section">
              <div className="section-title">Property details</div>
              <div className="details-grid">
                {property.property_type && (
                  <div className="det-card">
                    <div className="det-label">Type</div>
                    <div className="det-val">{property.property_type}</div>
                  </div>
                )}
                {property.listing_type && (
                  <div className="det-card">
                    <div className="det-label">Listing</div>
                    <div className="det-val">{isRent ? 'For Rent' : 'For Sale'}</div>
                  </div>
                )}
                {priceLabel && (
                  <div className="det-card">
                    <div className="det-label">Price</div>
                    <div className="det-val">{priceLabel}{property.price_unit ? `/${property.price_unit}` : ''}</div>
                  </div>
                )}
                {property.city && (
                  <div className="det-card">
                    <div className="det-label">City</div>
                    <div className="det-val">{property.city}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Location */}
            <div className="section">
              <div className="section-title">Location</div>
              <div className="loc-row">
                <span className="loc-pin">📍</span>
                <div className="loc-text">
                  {property.locality && <div className="loc-main">{property.locality}</div>}
                  {property.landmark && <div className="loc-sub">Near {property.landmark}</div>}
                  <div className="loc-sub">{property.city}, Nagaland</div>
                </div>
              </div>
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="maps-link">
                Open in Google Maps →
              </a>
            </div>

            {/* Owner edit (mobile) */}
            {isOwner && (
              <div className="section owner-section">
                <div className="section-title">Your listing</div>
                <Link href={`/real-estate/dashboard/edit/${property.id}`} className="edit-link">
                  ✏️ Edit this listing
                </Link>
              </div>
            )}

            {/* Bottom pad for mobile fixed CTAs */}
            <div style={{ height: 100 }} className="mobile-bottom-pad" />
          </div>

          {/* RIGHT / SIDEBAR — desktop only */}
          <div className="desktop-sidebar">

            {/* Contact card */}
            <div className="sb-card">
              <div className="sb-label">Contact Owner</div>
              {property.posted_by_name && (
                <div className="sb-owner-row">
                  <div className="sb-avatar">{property.posted_by_name[0]?.toUpperCase()}</div>
                  <div>
                    <div className="sb-name">{property.posted_by_name}</div>
                    <div className="sb-role">Property Owner</div>
                  </div>
                </div>
              )}
              {property.phone && (
                <a href={`tel:${property.phone}`} className="sb-btn-call" onClick={() => track('call')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.13 6.13l1.07-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  Call {property.phone}
                </a>
              )}
              {property.whatsapp && (
                <a href={waUrl} target="_blank" rel="noopener noreferrer" className="sb-btn-wa" onClick={() => track('whatsapp')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                  Chat on WhatsApp
                </a>
              )}
            </div>

            {/* Owner edit (desktop sidebar) */}
            {isOwner && (
              <div className="sb-card" style={{ borderLeft: '2px solid var(--red)' }}>
                <div className="sb-label">Your listing</div>
                <Link href={`/real-estate/dashboard/edit/${property.id}`} className="sb-btn-ghost">
                  ✏️ Edit this listing
                </Link>
              </div>
            )}

          </div>
        </div>

        {/* ── Fixed bottom CTAs (mobile only) ── */}
        <div className="fixed-cta">
          {property.phone && property.whatsapp ? (
            <>
              <a href={`tel:${property.phone}`} className="cta-btn cta-call" onClick={() => track('call')}>Call Owner</a>
              <a href={waUrl} target="_blank" rel="noopener noreferrer" className="cta-btn cta-wa" onClick={() => track('whatsapp')}>WhatsApp</a>
            </>
          ) : property.phone ? (
            <a href={`tel:${property.phone}`} className="cta-btn cta-call cta-full" onClick={() => track('call')}>Call Owner</a>
          ) : property.whatsapp ? (
            <a href={waUrl} target="_blank" rel="noopener noreferrer" className="cta-btn cta-wa cta-full" onClick={() => track('whatsapp')}>WhatsApp</a>
          ) : null}
        </div>
      </div>

      {/* ── All photos lightbox ── */}
      {showAllPhotos && (
        <div
          className="lb-overlay"
          onClick={e => { if (e.target === e.currentTarget) setShowAllPhotos(false); }}
        >
          <div className="lb-modal">
            <div className="lb-header">
              <span className="lb-title">All Photos ({validPhotos.length})</span>
              <button className="lb-close" onClick={() => setShowAllPhotos(false)}>✕</button>
            </div>
            <div className="lb-grid">
              {validPhotos.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`${property.title} photo ${i + 1}`}
                  className="lb-img"
                  onError={() => handlePhotoError(photos.indexOf(src))}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0a0a0a;
    --surface: #111;
    --surface2: #181818;
    --border: rgba(255,255,255,0.07);
    --red: #c0392b;
    --green: #25D366;
    --text: #f0f0f0;
    --text2: #888;
    --text3: #444;
  }
  body { font-family: 'Sora', sans-serif; background: var(--bg); color: var(--text); -webkit-font-smoothing: antialiased; }

  .pp { max-width: 480px; margin: 0 auto; padding-bottom: 0; }

  /* ── Top bar ── */
  .topbar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    height: 52px;
    display: flex; align-items: center;
    background: rgba(10,10,10,0.92);
    backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--border);
    padding: 0 14px;
    gap: 8px;
  }
  .topbar-back {
    font-size: 13px; font-weight: 600; color: var(--text2);
    text-decoration: none; white-space: nowrap;
    flex-shrink: 0;
  }
  .topbar-back:hover { color: var(--text); }
  .topbar-center {
    flex: 1; text-align: center;
    font-size: 12px; font-weight: 600; color: var(--text2);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .topbar-action {
    flex-shrink: 0;
    font-size: 12px; font-weight: 700; color: #fff;
    background: var(--red); padding: 7px 14px; border-radius: 8px;
    text-decoration: none; white-space: nowrap;
  }

  /* ── Gallery ── */
  .gal-wrap {
    margin-top: 52px;
    height: 56vw; min-height: 220px; max-height: 340px;
    background: var(--surface2);
    position: relative; overflow: hidden;
  }
  .gal-placeholder {
    width: 100%; height: 100%;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
    color: var(--text3);
  }
  .gal-icon { font-size: 3rem; }
  .gal-none { font-size: 13px; }

  .gal-grid {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 2px; height: 100%; position: relative;
  }
  .gal-main { overflow: hidden; height: 100%; background: #1a1a1a; }
  .gal-side { display: grid; grid-template-rows: 1fr 1fr; gap: 2px; }
  .gal-side-item { overflow: hidden; height: 100%; background: #1a1a1a; }
  .gal-side-empty { background: var(--surface2); }
  .gal-img { width: 100%; height: 100%; object-fit: contain; object-position: center; display: block; background: #1a1a1a; }

  .gal-badge {
    position: absolute; top: 10px; left: 10px; z-index: 4;
    font-size: 10px; font-weight: 800; letter-spacing: 1.2px;
    padding: 4px 10px; border-radius: 4px;
  }
  .gal-badge-sale { background: var(--red); color: #fff; }
  .gal-badge-rent { background: #0d2b1a; color: var(--green); border: 1px solid rgba(37,211,102,0.3); }

  .gal-see-all {
    position: absolute; bottom: 10px; right: 10px; z-index: 4;
    font-size: 11px; font-weight: 600; color: #fff;
    background: rgba(0,0,0,0.65); backdrop-filter: blur(6px);
    border: 1px solid rgba(255,255,255,0.15); border-radius: 6px;
    padding: 6px 12px; cursor: pointer;
    font-family: 'Sora', sans-serif;
  }

  /* ── Two-column wrapper (single column on mobile) ── */
  .desktop-body { display: block; }
  .desktop-main { /* full width on mobile */ }
  .desktop-sidebar { display: none; /* hidden on mobile */ }
  .mobile-bottom-pad { display: block; }

  /* ── Property head ── */
  .phead { padding: 16px 16px 0; }
  .phead-badge {
    display: inline-block;
    font-size: 10px; font-weight: 700; letter-spacing: 1.2px;
    color: var(--text3); background: var(--surface2);
    border: 1px solid var(--border); border-radius: 4px;
    padding: 3px 8px; margin-bottom: 8px;
  }
  .phead-title {
    font-size: 15px; font-weight: 700; line-height: 1.4;
    margin-bottom: 6px;
  }
  .phead-loc {
    font-size: 12px; color: var(--text2);
    display: flex; align-items: flex-start; gap: 4px;
    margin-bottom: 10px;
  }
  .phead-pin { flex-shrink: 0; }
  .phead-price-row {
    display: flex; align-items: baseline; gap: 8px;
  }
  .phead-price { font-size: 17px; font-weight: 800; }
  .phead-price-type {
    font-size: 11px; color: var(--text2);
    border: 1px solid var(--border); border-radius: 4px;
    padding: 2px 7px; font-weight: 500;
  }

  /* ── Specs strip ── */
  .specs-strip {
    margin: 16px 16px 0;
    display: flex; gap: 8px;
    overflow-x: auto; -webkit-overflow-scrolling: touch;
    scrollbar-width: none; padding-bottom: 2px;
  }
  .specs-strip::-webkit-scrollbar { display: none; }
  .spec-box {
    flex-shrink: 0;
    min-width: 72px;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 10px; padding: 10px 8px;
    display: flex; flex-direction: column; align-items: center; gap: 4px;
  }
  .spec-icon { font-size: 18px; line-height: 1; }
  .spec-val { font-size: 12px; font-weight: 700; text-align: center; }
  .spec-label { font-size: 10px; color: var(--text2); font-weight: 500; }

  /* ── Contact action icons ── */
  .contact-icons {
    margin: 20px 16px 0;
    display: flex; gap: 20px;
  }
  .ci-btn {
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    text-decoration: none;
  }
  .ci-circle {
    width: 52px; height: 52px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    transition: transform 0.15s, opacity 0.15s;
  }
  .ci-circle:active { transform: scale(0.93); opacity: 0.85; }
  .ci-call { background: var(--red); color: #fff; }
  .ci-wa { background: #1a3d26; color: var(--green); }
  .ci-label { font-size: 11px; font-weight: 600; color: var(--text2); }

  /* ── Sections ── */
  .section { margin: 24px 16px 0; }
  .section-title {
    font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;
    color: var(--text3); margin-bottom: 12px;
  }

  /* ── About ── */
  .about-clamped {
    font-size: 14px; line-height: 1.75; color: var(--text2); font-weight: 300;
    display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .about-expanded {
    font-size: 14px; line-height: 1.75; color: var(--text2); font-weight: 300;
  }
  .read-more {
    background: none; border: none; color: var(--red);
    font-size: 13px; font-weight: 600; cursor: pointer;
    padding: 6px 0 0; font-family: 'Sora', sans-serif;
    display: block;
  }

  /* ── Details grid ── */
  .details-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
  }
  .det-card {
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 10px; padding: 12px 14px;
  }
  .det-label { font-size: 10px; color: var(--text3); font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px; }
  .det-val { font-size: 13px; font-weight: 700; }

  /* ── Location ── */
  .loc-row { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 12px; }
  .loc-pin { font-size: 16px; flex-shrink: 0; margin-top: 1px; }
  .loc-main { font-size: 14px; font-weight: 600; margin-bottom: 2px; }
  .loc-sub { font-size: 12px; color: var(--text2); margin-bottom: 2px; }
  .maps-link {
    font-size: 13px; font-weight: 600; color: var(--red);
    text-decoration: none; display: inline-block;
  }

  /* ── Owner section ── */
  .owner-section { border-left: 2px solid var(--red); padding-left: 14px; }
  .edit-link {
    font-size: 13px; font-weight: 600; color: var(--text2);
    text-decoration: none; display: inline-block;
  }

  /* ── Fixed bottom CTAs ── */
  .fixed-cta {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 200;
    display: flex;
    background: var(--bg);
    border-top: 1px solid var(--border);
    padding: 10px 16px 10px;
    /* Safe area for phones with home bar */
    padding-bottom: max(10px, env(safe-area-inset-bottom, 10px));
  }
  .cta-btn {
    flex: 1;
    display: flex; align-items: center; justify-content: center;
    height: 48px; border-radius: 10px;
    font-size: 14px; font-weight: 700;
    text-decoration: none; font-family: 'Sora', sans-serif;
    transition: opacity 0.15s;
  }
  .cta-btn:active { opacity: 0.8; }
  .cta-call { background: var(--red); color: #fff; margin-right: 6px; }
  .cta-wa { background: #1a3d26; color: var(--green); margin-left: 6px; }
  .cta-full { flex: 1; margin: 0; }

  /* ── Lightbox ── */
  .lb-overlay {
    position: fixed; inset: 0; z-index: 500;
    background: rgba(0,0,0,0.88); backdrop-filter: blur(8px);
    display: flex; align-items: flex-end;
    animation: fadeIn 0.15s ease;
  }
  .lb-modal {
    width: 100%; max-height: 90vh; overflow-y: auto;
    background: var(--surface); border-radius: 20px 20px 0 0;
    padding: 20px 16px;
  }
  .lb-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
  .lb-title { font-size: 14px; font-weight: 700; }
  .lb-close { background: none; border: none; color: var(--text2); font-size: 18px; cursor: pointer; padding: 4px 8px; font-family: 'Sora', sans-serif; }
  .lb-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .lb-img { width: 100%; aspect-ratio: 4/3; object-fit: contain; object-position: center; background: #1a1a1a; border-radius: 8px; }

  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

  /* ── Desktop ── */
  @media (min-width: 768px) {
    /* Reset mobile container */
    .pp { max-width: 100%; }

    /* Nav stretches full width */
    .topbar { padding: 0 40px; }
    .topbar-back { font-size: 14px; }
    .topbar-center { font-size: 13px; }
    .topbar-action { font-size: 13px; padding: 8px 18px; }

    /* Gallery — full width, taller */
    .gal-wrap {
      height: 52vw;
      max-height: 520px;
      min-height: 360px;
    }

    /* Two-column body */
    .desktop-body {
      display: grid;
      grid-template-columns: 1fr 340px;
      gap: 0;
      max-width: 1160px;
      margin: 0 auto;
      padding: 0 40px 80px;
      align-items: start;
    }

    /* Left column */
    .desktop-main { padding-right: 40px; }

    /* Show sidebar, hide mobile-only elements */
    .desktop-sidebar { display: block; }
    .contact-icons { display: none; }
    .mobile-bottom-pad { display: none; }

    /* Larger typography */
    .phead { padding: 28px 0 0; }
    .phead-badge { font-size: 11px; }
    .phead-title { font-size: 22px; }
    .phead-loc { font-size: 13px; }
    .phead-price { font-size: 26px; }
    .phead-price-type { font-size: 12px; }

    /* Specs strip — no scroll needed on desktop */
    .specs-strip { margin: 20px 0 0; overflow-x: visible; flex-wrap: wrap; }
    .spec-box { min-width: 80px; padding: 12px 10px; }

    /* Contact icons */
    .contact-icons { margin: 24px 0 0; }

    /* Sections */
    .section { margin: 28px 0 0; }

    /* Hide the fixed mobile CTA bar */
    .fixed-cta { display: none; }

    /* Sidebar */
    .desktop-sidebar {
      position: sticky;
      top: 68px;
      padding-top: 28px;
    }
    .sb-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 22px;
      margin-bottom: 14px;
    }
    .sb-label {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 2px; color: var(--text3); margin-bottom: 16px;
    }
    .sb-owner-row {
      display: flex; align-items: center; gap: 12px;
      margin-bottom: 18px; padding-bottom: 16px;
      border-bottom: 1px solid var(--border);
    }
    .sb-avatar {
      width: 40px; height: 40px; border-radius: 50%;
      background: var(--surface2); border: 1px solid var(--border);
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; font-weight: 700; color: var(--text2); flex-shrink: 0;
    }
    .sb-name { font-size: 14px; font-weight: 600; }
    .sb-role { font-size: 11px; color: var(--text3); margin-top: 2px; }
    .sb-btn-call {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      width: 100%; height: 46px; border-radius: 10px;
      background: var(--red); color: #fff;
      font-size: 13px; font-weight: 700; text-decoration: none;
      font-family: 'Sora', sans-serif; margin-bottom: 8px;
      transition: opacity 0.15s;
    }
    .sb-btn-call:hover { opacity: 0.85; }
    .sb-btn-wa {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      width: 100%; height: 46px; border-radius: 10px;
      background: #1a3d26; color: var(--green);
      border: 1px solid rgba(37,211,102,0.2);
      font-size: 13px; font-weight: 700; text-decoration: none;
      font-family: 'Sora', sans-serif; margin-bottom: 8px;
      transition: opacity 0.15s;
    }
    .sb-btn-wa:hover { opacity: 0.85; }
    .sb-btn-ghost {
      display: flex; align-items: center; justify-content: center; gap: 6px;
      width: 100%; height: 40px; border-radius: 10px;
      background: transparent; color: var(--text2);
      border: 1px solid var(--border);
      font-size: 12px; font-weight: 600; text-decoration: none;
      font-family: 'Sora', sans-serif;
      transition: border-color 0.15s, color 0.15s;
    }
    .sb-btn-ghost:hover { border-color: var(--border2, rgba(255,255,255,0.15)); color: var(--text); }

    /* Lightbox grid wider on desktop */
    .lb-modal { border-radius: 16px; max-width: 800px; margin: auto; }
    .lb-grid { grid-template-columns: repeat(3, 1fr); }
    .lb-overlay { align-items: center; }
  }
`;

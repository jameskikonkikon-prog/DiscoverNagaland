'use client';

import { useState, useCallback, useEffect } from 'react';
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
  area?: number;
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
};

type Props = {
  property: Property;
  isOwner: boolean;
  isLoggedIn: boolean;
};

function getPropertyEmoji(type?: string): string {
  const t = (type || '').toLowerCase();
  if (t.includes('apartment') || t.includes('flat')) return '🏢';
  if (t.includes('villa') || t.includes('bungalow')) return '🏡';
  if (t.includes('house')) return '🏠';
  if (t.includes('land') || t.includes('plot')) return '🌿';
  if (t.includes('office')) return '🏢';
  if (t.includes('shop') || t.includes('commercial')) return '🏪';
  return '🏘️';
}

function formatPrice(price?: number): string | null {
  if (!price) return null;
  if (price >= 10000000) {
    const v = price / 10000000;
    return `₹${v % 1 === 0 ? v.toFixed(0) : parseFloat(v.toFixed(2)).toString()} Cr`;
  }
  if (price >= 100000) {
    const v = price / 100000;
    return `₹${v % 1 === 0 ? v.toFixed(0) : parseFloat(v.toFixed(1)).toString()} L`;
  }
  if (price >= 1000) {
    return `₹${(price / 1000).toFixed(0)}k`;
  }
  return `₹${price.toLocaleString()}`;
}

function getListingLabel(type?: string): string {
  const t = (type || '').toLowerCase();
  if (t.includes('rent')) return 'For Rent';
  if (t.includes('sale')) return 'For Sale';
  return type || '';
}

export default function PropertyPageClient({ property, isOwner, isLoggedIn }: Props) {
  const [failedPhotos, setFailedPhotos] = useState<Set<number>>(new Set());
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [copied, setCopied] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 100);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handlePhotoError = useCallback((index: number) => {
    setFailedPhotos(prev => new Set(prev).add(index));
  }, []);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const photos = property.photos?.length ? property.photos : [];
  const validIndices = photos.map((_, i) => i).filter(i => !failedPhotos.has(i));
  const allPhotosFailed = photos.length > 0 && validIndices.length === 0;

  const propertyEmoji = getPropertyEmoji(property.property_type);
  const priceLabel = formatPrice(property.price);
  const listingLabel = getListingLabel(property.listing_type);
  const isRent = listingLabel === 'For Rent';

  const locationParts = [property.locality, property.city].filter(Boolean);
  const locationLine = locationParts.join(', ');

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
  const shareText = typeof window !== 'undefined' ? encodeURIComponent(`Check out this property on Yana Nagaland: ${window.location.href}`) : '';
  const shareWaUrl = `https://wa.me/?text=${shareText}`;

  const renderGallery = () => {
    if (photos.length === 0 || allPhotosFailed) {
      return (
        <div className="gallery-placeholder">
          <span>{propertyEmoji}</span>
          <p>No photos yet</p>
        </div>
      );
    }

    if (validIndices.length === 0) {
      return (
        <div className="gallery-placeholder">
          <span>{propertyEmoji}</span>
          <p>No photos yet</p>
        </div>
      );
    }

    if (validIndices.length === 1) {
      return (
        <div className="gallery-single">
          <img
            src={photos[validIndices[0]]}
            alt={property.title}
            className="gallery-img-single"
            onError={() => handlePhotoError(validIndices[0])}
          />
          <div className="gallery-grad" />
        </div>
      );
    }

    if (validIndices.length === 2) {
      return (
        <div className="gallery-duo">
          {validIndices.map(idx => (
            <div key={idx} className="gallery-duo-item">
              <img
                src={photos[idx]}
                alt={property.title}
                className="gallery-img-fill"
                onError={() => handlePhotoError(idx)}
              />
            </div>
          ))}
          <div className="gallery-grad" />
        </div>
      );
    }

    const mainIdx = validIndices[0];
    const rightIdx1 = validIndices[1];
    const rightIdx2 = validIndices[2];

    return (
      <div className="gallery-grid">
        <div className="gallery-main">
          <img
            src={photos[mainIdx]}
            alt={property.title}
            className="gallery-img-fill"
            onError={() => handlePhotoError(mainIdx)}
          />
        </div>
        <div className="gallery-side">
          <div className="gallery-side-item">
            <img
              src={photos[rightIdx1]}
              alt={`${property.title} photo`}
              className="gallery-img-fill"
              onError={() => handlePhotoError(rightIdx1)}
            />
          </div>
          <div className="gallery-side-item">
            <img
              src={photos[rightIdx2]}
              alt={`${property.title} photo`}
              className="gallery-img-fill"
              onError={() => handlePhotoError(rightIdx2)}
            />
          </div>
        </div>
        <div className="gallery-grad" />
        {validIndices.length >= 4 && (
          <button
            type="button"
            className="view-all-photos-btn"
            onClick={() => setShowAllPhotos(true)}
          >
            View all {validIndices.length} photos
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <style>{styles}</style>
      <main className="prop-page">

        {/* Nav */}
        <nav className={`nav ${navScrolled ? 'scrolled' : ''}`}>
          <Link href="/" className="nav-logo">Yana<span>Nagaland</span></Link>
          <div className="nav-center">{property.title} · {property.city}</div>
          <div className="nav-right">
            <Link href="/real-estate" className="nav-link">← Properties</Link>
            {isLoggedIn ? (
              <Link href="/real-estate/dashboard" className="nav-cta">My Listings</Link>
            ) : (
              <Link href="/real-estate/dashboard" className="nav-cta">List Property</Link>
            )}
          </div>
        </nav>

        {/* Gallery */}
        <div className="gallery">
          {renderGallery()}
        </div>

        <div className="content">

          {/* Left column */}
          <div className="left">

            {/* Header */}
            <div className="hero-text fade-up">
              <div className="header-pills">
                {property.property_type && (
                  <span className="type-tag">{propertyEmoji} {property.property_type}</span>
                )}
                {listingLabel && (
                  <span className={`listing-tag ${isRent ? 'rent' : 'sale'}`}>{listingLabel}</span>
                )}
                {property.is_featured && (
                  <span className="featured-chip">⭐ Featured</span>
                )}
              </div>
              <div className="prop-title">{property.title}</div>
              {locationLine && (
                <div className="location-line">
                  <span>📍</span>
                  <span>{locationLine}, Nagaland</span>
                </div>
              )}
              {priceLabel && (
                <div className="price-row">
                  <span className="price-value">{priceLabel}</span>
                  {property.price_unit && (
                    <span className="price-unit">/{property.price_unit}</span>
                  )}
                </div>
              )}
            </div>

            {/* Mobile CTAs */}
            <div className="mobile-cta fade-up-2">
              {property.phone && (
                <a href={`tel:${property.phone}`} className="m-call" onClick={() => track('call')}>📞 Call Owner</a>
              )}
              {property.whatsapp && (
                <a href={waUrl} target="_blank" rel="noopener noreferrer" className="m-wa" onClick={() => track('whatsapp')}>💬 WhatsApp</a>
              )}
            </div>

            {/* Property Details card */}
            <div className="card fade-up-3">
              <div className="card-head">Property Details</div>
              <div className="details-grid">
                {property.property_type && (
                  <div className="detail-item">
                    <div className="detail-label">Type</div>
                    <div className="detail-value">{property.property_type}</div>
                  </div>
                )}
                {listingLabel && (
                  <div className="detail-item">
                    <div className="detail-label">Listing</div>
                    <div className="detail-value">{listingLabel}</div>
                  </div>
                )}
                {property.area && (
                  <div className="detail-item">
                    <div className="detail-label">Area</div>
                    <div className="detail-value">{property.area.toLocaleString()} {property.area_unit || 'sq ft'}</div>
                  </div>
                )}
                {priceLabel && (
                  <div className="detail-item">
                    <div className="detail-label">Price</div>
                    <div className="detail-value price-highlight">{priceLabel}{property.price_unit ? `/${property.price_unit}` : ''}</div>
                  </div>
                )}
                {property.city && (
                  <div className="detail-item">
                    <div className="detail-label">City</div>
                    <div className="detail-value">{property.city}</div>
                  </div>
                )}
                {property.locality && (
                  <div className="detail-item">
                    <div className="detail-label">Locality</div>
                    <div className="detail-value">{property.locality}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Description card */}
            {property.description && (
              <div className="card fade-up-3">
                <div className="card-head">About This Property</div>
                <p className="about-text">{property.description}</p>
              </div>
            )}

            {/* Location card */}
            <div className="card fade-up-4">
              <div className="card-head">Location</div>
              <div className="hi-row">
                <div className="hi-icon">📍</div>
                <div className="hi-content">
                  {property.locality && <div className="hi-value">{property.locality}</div>}
                  {property.landmark && <div className="hi-sub">Near {property.landmark}</div>}
                  <div className="hi-sub">{property.city}, Nagaland</div>
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="hi-link">Open in Google Maps →</a>
                </div>
              </div>
            </div>

          </div>

          {/* Sidebar */}
          <div className="sidebar">

            {/* Contact card */}
            <div className="sidebar-card">
              <div className="sc-label">Contact Owner</div>
              {property.posted_by_name && (
                <div className="posted-by">
                  <div className="posted-avatar">{property.posted_by_name[0]?.toUpperCase()}</div>
                  <div className="posted-info">
                    <div className="posted-name">{property.posted_by_name}</div>
                    <div className="posted-role">Property Owner</div>
                  </div>
                </div>
              )}
              {property.phone && (
                <a href={`tel:${property.phone}`} className="btn-primary" onClick={() => track('call')}>📞 Call {property.phone}</a>
              )}
              {property.whatsapp && (
                <a href={waUrl} target="_blank" rel="noopener noreferrer" className="btn-wa" onClick={() => track('whatsapp')}>💬 Chat on WhatsApp</a>
              )}
            </div>

            {/* Share card */}
            <div className="sidebar-card">
              <div className="sc-label">Share</div>
              <div className="share-row">
                <a href={shareWaUrl} target="_blank" rel="noopener noreferrer" className="share-btn">💬 WhatsApp</a>
                <button type="button" className="share-btn" onClick={copyLink}>
                  {copied ? '✓ Copied!' : '🔗 Copy Link'}
                </button>
              </div>
            </div>

            {/* Map card */}
            <div className="sidebar-card">
              <div className="sc-label">Location</div>
              <div
                className="map-box"
                onClick={() => window.open(mapsUrl, '_blank')}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && window.open(mapsUrl, '_blank')}
              >
                <div className="map-grid" />
                <span className="map-pin">📍</span>
              </div>
              <div className="loc-name">{property.locality || property.city}</div>
              {property.landmark && <div className="loc-sub">Near {property.landmark}</div>}
              <div className="loc-sub">{property.city}, Nagaland</div>
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost">🗺️ Open in Google Maps</a>
            </div>

            {/* Owner edit card */}
            {isOwner && (
              <div className="sidebar-card owner-card">
                <div className="sc-label">Your Listing</div>
                <div className="owner-sub">You own this property listing.</div>
                <Link href={`/real-estate/dashboard/edit/${property.id}`} className="btn-ghost">✏️ Edit This Listing</Link>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* All photos lightbox */}
      {showAllPhotos && (
        <div className="photos-overlay" onClick={e => { if (e.target === e.currentTarget) setShowAllPhotos(false); }}>
          <div className="photos-modal">
            <div className="photos-modal-header">
              <div className="photos-modal-title">All Photos</div>
              <button className="cm-close" onClick={() => setShowAllPhotos(false)} aria-label="Close">✕</button>
            </div>
            <div className="photos-modal-grid">
              {photos.map((p, i) => !failedPhotos.has(i) && (
                <img
                  key={i}
                  src={p}
                  alt={`${property.title} photo ${i + 1}`}
                  className="photos-modal-img"
                  onError={() => handlePhotoError(i)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg:#0a0a0a;
    --surface:#0f0f0f;
    --surface2:#141414;
    --surface3:#1a1a1a;
    --border:rgba(255,255,255,0.06);
    --border2:rgba(255,255,255,0.1);
    --red:#c0392b;
    --red-soft:rgba(192,57,43,0.1);
    --red-border:rgba(192,57,43,0.25);
    --green:#25D366;
    --text:#f5f5f5;
    --text2:#999;
    --text3:#555;
    --sale:#c0392b;
    --sale-soft:rgba(192,57,43,0.12);
    --rent:#1a6b3c;
    --rent-soft:rgba(26,107,60,0.12);
    --rent-border:rgba(37,211,102,0.2);
  }
  html { scroll-behavior: smooth; }
  body { font-family: 'Sora', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; -webkit-font-smoothing: antialiased; }

  @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .fade-up  { animation: fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) both; }
  .fade-up-2 { animation: fadeUp 0.6s 0.1s cubic-bezier(0.22,1,0.36,1) both; }
  .fade-up-3 { animation: fadeUp 0.6s 0.2s cubic-bezier(0.22,1,0.36,1) both; }
  .fade-up-4 { animation: fadeUp 0.6s 0.3s cubic-bezier(0.22,1,0.36,1) both; }

  .prop-page { min-height: 100vh; }

  /* Nav */
  .nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 200;
    height: 56px;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 40px;
    background: rgba(10,10,10,0.8);
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border);
    transition: background 0.3s;
  }
  .nav.scrolled { background: rgba(10,10,10,0.95); }
  .nav-logo { font-size: 17px; font-weight: 800; letter-spacing: -0.5px; text-decoration: none; color: var(--text); }
  .nav-logo span { color: var(--red); }
  .nav-center {
    position: absolute; left: 50%; transform: translateX(-50%);
    font-size: 13px; font-weight: 500; color: var(--text2);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 320px;
  }
  .nav-right { display: flex; align-items: center; gap: 8px; }
  .nav-link { font-size: 12px; font-weight: 600; color: var(--text2); text-decoration: none; padding: 6px 14px; border-radius: 8px; transition: color 0.2s; }
  .nav-link:hover { color: var(--text); }
  .nav-cta { font-size: 12px; font-weight: 700; color: #fff; text-decoration: none; padding: 7px 16px; border-radius: 8px; background: var(--red); transition: opacity 0.2s; }
  .nav-cta:hover { opacity: 0.85; }

  /* Gallery */
  .gallery {
    margin-top: 56px; position: relative;
    height: 420px; max-height: 480px; min-height: 300px;
    background: var(--surface2); overflow: hidden;
  }
  .gallery-grad {
    position: absolute; inset: 0;
    background: linear-gradient(to bottom, rgba(10,10,10,0) 0%, rgba(10,10,10,0) 60%, rgba(10,10,10,0.6) 85%, rgba(10,10,10,1) 100%);
    pointer-events: none; z-index: 2;
  }
  .gallery-placeholder { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; color: var(--text3); font-size: 3.5rem; }
  .gallery-placeholder p { font-size: 0.9rem; }

  .gallery-single { width: 100%; height: 100%; position: relative; }
  .gallery-img-single { width: 100%; height: 100%; object-fit: cover; display: block; }

  .gallery-duo { display: grid; grid-template-columns: 1fr 1fr; gap: 3px; height: 100%; position: relative; }
  .gallery-duo-item { overflow: hidden; }
  .gallery-img-fill { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.5s cubic-bezier(0.22,1,0.36,1); }
  .gallery-duo-item:hover .gallery-img-fill { transform: scale(1.03); }

  .gallery-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3px; height: 100%; position: relative; }
  .gallery-main { overflow: hidden; }
  .gallery-main:hover .gallery-img-fill { transform: scale(1.03); }
  .gallery-side { display: grid; grid-template-rows: 1fr 1fr; gap: 3px; }
  .gallery-side-item { overflow: hidden; }
  .gallery-side-item:hover .gallery-img-fill { transform: scale(1.03); }

  .view-all-photos-btn {
    position: absolute; bottom: 20px; right: 20px; z-index: 3;
    padding: 8px 18px; border-radius: 8px;
    background: rgba(0,0,0,0.7); border: 1px solid rgba(255,255,255,0.15);
    backdrop-filter: blur(8px); color: #fff; font-size: 12px; font-weight: 600;
    cursor: pointer; font-family: 'Sora', sans-serif; transition: all 0.2s;
  }
  .view-all-photos-btn:hover { background: rgba(0,0,0,0.85); border-color: rgba(255,255,255,0.3); }

  /* Content layout */
  .content {
    max-width: 1100px; margin: 0 auto;
    padding: 0 40px 100px;
    display: grid; grid-template-columns: 1fr 320px; gap: 32px;
    align-items: start;
  }

  /* Header */
  .hero-text { padding: 32px 0 28px; margin-bottom: 24px; }
  .header-pills { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }

  .type-tag {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 11px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase;
    color: var(--text2); background: var(--surface2); border: 1px solid var(--border2);
    padding: 4px 12px; border-radius: 20px;
  }
  .listing-tag {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
    padding: 4px 12px; border-radius: 20px;
  }
  .listing-tag.sale { color: #fff; background: var(--red); }
  .listing-tag.rent { color: var(--green); background: #0e2b1a; border: 1px solid var(--rent-border); }
  .featured-chip {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px;
    background: rgba(255,215,0,0.1); color: #d4af37; border: 1px solid rgba(212,175,55,0.25);
  }

  .prop-title { font-size: 36px; font-weight: 800; letter-spacing: -1px; line-height: 1.15; margin-bottom: 10px; }
  .location-line { font-size: 13px; color: var(--text2); display: flex; align-items: center; gap: 6px; margin-bottom: 14px; }
  .price-row { display: flex; align-items: baseline; gap: 4px; margin-top: 6px; }
  .price-value { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; color: var(--text); }
  .price-unit { font-size: 14px; color: var(--text2); font-weight: 400; }

  /* Mobile CTAs */
  .mobile-cta { display: none; gap: 10px; margin-bottom: 24px; }
  .m-call, .m-wa { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px; border-radius: 12px; font-size: 13px; font-weight: 700; text-decoration: none; cursor: pointer; font-family: 'Sora', sans-serif; transition: opacity 0.2s; }
  .m-call { background: var(--red); color: #fff; }
  .m-wa { background: #0e2b1a; color: var(--green); border: 1px solid var(--rent-border); }
  .m-call:hover, .m-wa:hover { opacity: 0.85; }

  /* Cards */
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 20px;
  }
  .card-head { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: var(--text3); margin-bottom: 18px; }

  /* Property details grid */
  .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--border); border-radius: 10px; overflow: hidden; }
  .detail-item { background: var(--surface2); padding: 14px 16px; }
  .detail-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px; color: var(--text3); margin-bottom: 5px; }
  .detail-value { font-size: 14px; font-weight: 600; color: var(--text); }
  .detail-value.price-highlight { color: var(--text); font-size: 15px; }

  /* About */
  .about-text { font-size: 15px; line-height: 1.85; color: var(--text2); font-weight: 300; }

  /* Location info */
  .hi-row { display: flex; gap: 14px; padding: 14px 0; }
  .hi-row:first-of-type { padding-top: 0; }
  .hi-icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }
  .hi-content { flex: 1; }
  .hi-value { font-size: 14px; font-weight: 600; color: var(--text); }
  .hi-sub { font-size: 12px; color: var(--text2); margin-top: 3px; }
  .hi-link { font-size: 12px; color: var(--red); text-decoration: none; font-weight: 600; margin-top: 6px; display: inline-block; transition: opacity 0.2s; }
  .hi-link:hover { opacity: 0.7; }

  /* Sidebar */
  .sidebar { position: sticky; top: 76px; }
  .sidebar-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 22px; margin-bottom: 14px; }
  .sc-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: var(--text3); margin-bottom: 16px; }

  /* Posted by */
  .posted-by { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; padding-bottom: 18px; border-bottom: 1px solid var(--border); }
  .posted-avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--surface3); border: 1px solid var(--border2); display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; color: var(--text2); flex-shrink: 0; }
  .posted-name { font-size: 14px; font-weight: 600; color: var(--text); }
  .posted-role { font-size: 11px; color: var(--text3); margin-top: 2px; }

  /* Sidebar buttons */
  .btn-primary { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 14px; border-radius: 12px; background: var(--red); color: #fff; font-size: 13px; font-weight: 700; text-decoration: none; border: none; cursor: pointer; font-family: 'Sora', sans-serif; transition: opacity 0.2s; margin-bottom: 8px; letter-spacing: 0.2px; }
  .btn-primary:hover { opacity: 0.85; }
  .btn-wa { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 14px; border-radius: 12px; background: #0e2b1a; color: var(--green); border: 1px solid var(--rent-border); font-size: 13px; font-weight: 700; text-decoration: none; cursor: pointer; font-family: 'Sora', sans-serif; transition: all 0.2s; margin-bottom: 8px; }
  .btn-wa:hover { background: #1a3d24; }
  .btn-ghost { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px; border-radius: 12px; background: transparent; color: var(--text2); border: 1px solid var(--border); font-size: 12px; font-weight: 600; text-decoration: none; cursor: pointer; font-family: 'Sora', sans-serif; transition: all 0.2s; }
  .btn-ghost:hover { border-color: var(--border2); color: var(--text); }

  /* Share */
  .share-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .share-btn { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; border-radius: 10px; background: var(--surface2); color: var(--text2); border: 1px solid var(--border); font-size: 11px; font-weight: 600; cursor: pointer; font-family: 'Sora', sans-serif; transition: all 0.2s; text-decoration: none; }
  .share-btn:hover { border-color: var(--border2); color: var(--text); }

  /* Map */
  .map-box { background: var(--surface2); border-radius: 10px; height: 110px; display: flex; align-items: center; justify-content: center; margin-bottom: 14px; border: 1px solid var(--border); cursor: pointer; transition: border-color 0.2s; overflow: hidden; position: relative; }
  .map-box:hover { border-color: var(--border2); }
  .map-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px); background-size: 20px 20px; }
  .map-pin { font-size: 28px; position: relative; z-index: 1; }
  .loc-name { font-size: 13px; font-weight: 600; margin-bottom: 2px; }
  .loc-sub { font-size: 11px; color: var(--text2); margin-bottom: 4px; }

  /* Owner card */
  .owner-card { border-left: 2px solid var(--red); }
  .owner-sub { font-size: 12px; color: var(--text2); margin-bottom: 14px; line-height: 1.5; }

  /* Photos lightbox */
  .photos-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; padding: 20px; animation: fadeIn 0.15s ease; overflow-y: auto; }
  .photos-modal { background: var(--surface); border: 1px solid var(--border2); border-radius: 20px; padding: 28px; width: 100%; max-width: 800px; max-height: 90vh; overflow-y: auto; animation: fadeUp 0.2s cubic-bezier(0.22,1,0.36,1) both; }
  .photos-modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
  .photos-modal-title { font-size: 15px; font-weight: 800; }
  .photos-modal-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
  .photos-modal-img { width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: 10px; }
  .cm-close { background: none; border: none; color: var(--text2); font-size: 16px; cursor: pointer; padding: 4px 8px; border-radius: 6px; line-height: 1; transition: color 0.15s; font-family: 'Sora', sans-serif; }
  .cm-close:hover { color: var(--text); }

  /* Mobile */
  @media (max-width: 900px) {
    .content { grid-template-columns: 1fr; padding: 0 20px 80px; }
    .sidebar { display: none; }
    .mobile-cta { display: flex; }
    .prop-title { font-size: 26px; }
    .price-value { font-size: 22px; }
    .gallery { height: 50vw; min-height: 220px; }
    .gallery-grid { grid-template-columns: 1fr; }
    .gallery-side { display: none; }
    .gallery-duo { grid-template-columns: 1fr; }
    .gallery-duo-item:nth-child(2) { display: none; }
    .details-grid { grid-template-columns: 1fr; }
    .nav { padding: 0 20px; }
    .nav-center { display: none; }
    .photos-modal-grid { grid-template-columns: 1fr 1fr; }
  }
`;

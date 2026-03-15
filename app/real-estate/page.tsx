'use client';

import { useEffect, useState, useMemo } from 'react';

type Property = {
  id: string;
  title: string;
  property_type: 'land' | 'house' | 'apartment' | 'commercial';
  listing_type: 'sale' | 'rent';
  city: string;
  locality: string | null;
  landmark: string | null;
  price: number | null;
  price_unit: string | null;
  area: number | null;
  area_unit: string | null;
  description: string | null;
  photos: string[] | null;
  posted_by_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  is_available: boolean;
  is_featured: boolean;
  created_at: string;
};

type ActiveFilter = 'all' | 'sale' | 'rent' | 'land' | 'house_apt' | 'kohima' | 'dimapur';

const FILTERS: { key: ActiveFilter; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'sale',      label: 'For Sale' },
  { key: 'rent',      label: 'For Rent' },
  { key: 'land',      label: 'Land' },
  { key: 'house_apt', label: 'House / Apartment' },
  { key: 'kohima',    label: 'Kohima' },
  { key: 'dimapur',   label: 'Dimapur' },
];

function formatPrice(price: number | null, unit: string | null): string {
  if (!price) return 'Price on request';
  if (unit === 'negotiable') return 'Negotiable';
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(price);
  if (unit === 'per_month') return `${formatted}/mo`;
  if (unit === 'per_sqft') return `${formatted}/sqft`;
  if (unit === 'per_acre') return `${formatted}/acre`;
  return formatted;
}

function formatArea(area: number | null, unit: string | null): string | null {
  if (!area) return null;
  return `${area.toLocaleString('en-IN')} ${unit ?? 'sqft'}`;
}

function typeLabel(type: string): string {
  const map: Record<string, string> = {
    land: 'Land',
    house: 'House',
    apartment: 'Apartment',
    commercial: 'Commercial',
  };
  return map[type] ?? type;
}

function whatsappUrl(number: string): string {
  const clean = number.replace(/\D/g, '');
  const withCode = clean.startsWith('91') ? clean : `91${clean}`;
  return `https://wa.me/${withCode}`;
}

export default function RealEstatePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');

  useEffect(() => {
    fetch('/api/real-estate')
      .then(r => r.json())
      .then(d => {
        setProperties(d.properties ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    switch (activeFilter) {
      case 'sale':      return properties.filter(p => p.listing_type === 'sale');
      case 'rent':      return properties.filter(p => p.listing_type === 'rent');
      case 'land':      return properties.filter(p => p.property_type === 'land');
      case 'house_apt': return properties.filter(p => p.property_type === 'house' || p.property_type === 'apartment');
      case 'kohima':    return properties.filter(p => p.city.toLowerCase() === 'kohima');
      case 'dimapur':   return properties.filter(p => p.city.toLowerCase() === 'dimapur');
      default:          return properties;
    }
  }, [properties, activeFilter]);

  return (
    <>
      <style>{styles}</style>
      <div className="re-root">

        {/* NAV */}
        <nav className="re-nav">
          <a href="/" className="re-brand">
            <svg width="28" height="32" viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="rePinG" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8B0000"/>
                  <stop offset="50%" stopColor="#c0392b"/>
                  <stop offset="100%" stopColor="#922B21"/>
                </linearGradient>
                <radialGradient id="reGlassG" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#1a1a1a"/>
                  <stop offset="100%" stopColor="#0d0d0d"/>
                </radialGradient>
              </defs>
              <path d="M60 18 C38 18 20 36 20 58 C20 82 60 120 60 120 C60 120 100 82 100 58 C100 36 82 18 60 18Z" fill="url(#rePinG)"/>
              <circle cx="60" cy="58" r="19" fill="url(#reGlassG)" stroke="white" strokeWidth="2.5"/>
              <path d="M54 52 L68 66" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M54 52 L54 60 L62 52 Z" fill="white"/>
              <line x1="74" y1="72" x2="84" y2="82" stroke="white" strokeWidth="4" strokeLinecap="round"/>
            </svg>
            <div className="re-wordmark">
              <span className="re-w-yana">Yana</span>
              <span className="re-w-naga">Nagaland</span>
            </div>
          </a>
          <div className="re-nav-links">
            <a href="/" className="re-navlink">Businesses</a>
            <span className="re-navlink re-navlink-active">Real Estate</span>
          </div>
        </nav>

        {/* HERO */}
        <div className="re-hero">
          <div className="re-hero-badge">
            <span className="re-badge-dot" />
            Property listings across Nagaland
          </div>
          <h1 className="re-hero-title">Real Estate in<br /><em>Nagaland</em></h1>
          <p className="re-hero-sub">
            Land for sale · Houses & apartments · Commercial spaces<br />
            Browse properties directly from owners across Kohima, Dimapur and beyond.
          </p>
        </div>

        {/* FILTERS */}
        <div className="re-filters-wrap">
          <div className="re-filters">
            {FILTERS.map(f => (
              <button
                key={f.key}
                className={`re-chip${activeFilter === f.key ? ' re-chip-active' : ''}`}
                onClick={() => setActiveFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
          {!loading && (
            <span className="re-count">
              {filtered.length} {filtered.length === 1 ? 'property' : 'properties'}
            </span>
          )}
        </div>

        {/* GRID */}
        <div className="re-content">
          {loading ? (
            <div className="re-skeleton-grid">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="re-skeleton-card" />
              ))}
            </div>
          ) : error ? (
            <div className="re-empty">
              <div className="re-empty-icon">⚠</div>
              <div>Failed to load properties. Please try again.</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="re-empty">
              <div className="re-empty-icon">🏡</div>
              <div>No properties found for this filter.</div>
              <button className="re-empty-reset" onClick={() => setActiveFilter('all')}>Show all</button>
            </div>
          ) : (
            <div className="re-grid">
              {filtered.map(p => (
                <PropertyCard key={p.id} property={p} />
              ))}
            </div>
          )}
        </div>

        <footer className="re-footer">
          <a href="/">← Back to Yana Nagaland</a>
        </footer>
      </div>
    </>
  );
}

function PropertyCard({ property: p }: { property: Property }) {
  const photo = p.photos?.[0] ?? null;
  const area = formatArea(p.area, p.area_unit);
  const price = formatPrice(p.price, p.price_unit);
  const location = [p.locality, p.city].filter(Boolean).join(', ');

  return (
    <div className={`re-card${p.is_featured ? ' re-card-featured' : ''}`}>
      {/* Photo */}
      <div className="re-card-photo">
        {photo ? (
          <img src={photo} alt={p.title} className="re-card-img" />
        ) : (
          <div className="re-card-photo-placeholder">
            <span className="re-placeholder-icon">
              {p.property_type === 'land' ? '🌿' : p.property_type === 'apartment' ? '🏢' : '🏠'}
            </span>
          </div>
        )}
        <span className={`re-badge-listing ${p.listing_type === 'sale' ? 're-badge-sale' : 're-badge-rent'}`}>
          {p.listing_type === 'sale' ? 'FOR SALE' : 'FOR RENT'}
        </span>
        {p.is_featured && <span className="re-badge-featured">Featured</span>}
      </div>

      {/* Body */}
      <div className="re-card-body">
        <div className="re-card-type">{typeLabel(p.property_type)}</div>
        <div className="re-card-title">{p.title}</div>
        {location && <div className="re-card-location">📍 {location}</div>}

        <div className="re-card-stats">
          <span className="re-card-price">{price}</span>
          {area && <span className="re-card-area">{area}</span>}
        </div>

        {p.description && (
          <div className="re-card-desc">{p.description}</div>
        )}

        {p.posted_by_name && (
          <div className="re-card-poster">Listed by {p.posted_by_name}</div>
        )}
      </div>

      {/* Actions */}
      {(p.whatsapp || p.phone) && (
        <div className="re-card-actions">
          {p.whatsapp && (
            <a
              href={whatsappUrl(p.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="re-action-btn re-wa-btn"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              WhatsApp
            </a>
          )}
          {p.phone && (
            <a href={`tel:${p.phone}`} className="re-action-btn re-call-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.06 6.06l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              Call
            </a>
          )}
        </div>
      )}
    </div>
  );
}

const styles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .re-root {
    min-height: 100vh;
    background: #0a0a0a;
    color: #e0e0e0;
    font-family: 'Sora', sans-serif;
  }

  /* NAV */
  .re-nav {
    position: sticky; top: 0; z-index: 100;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 28px; height: 60px;
    background: rgba(10,10,10,0.92);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .re-brand {
    display: flex; align-items: center; gap: 10px; text-decoration: none;
  }
  .re-wordmark {
    display: flex; flex-direction: column; line-height: 1.1;
  }
  .re-w-yana {
    font-size: 1rem; font-weight: 800; color: #fff; letter-spacing: -0.01em;
  }
  .re-w-naga {
    font-size: 0.6rem; font-weight: 500; color: rgba(255,255,255,0.4); letter-spacing: 0.08em; text-transform: uppercase;
  }
  .re-nav-links {
    display: flex; align-items: center; gap: 4px;
  }
  .re-navlink {
    font-size: 0.82rem; font-weight: 500; color: rgba(255,255,255,0.45);
    text-decoration: none; padding: 6px 14px; border-radius: 8px;
    transition: color 0.15s, background 0.15s;
  }
  .re-navlink:hover { color: rgba(255,255,255,0.8); background: rgba(255,255,255,0.04); }
  .re-navlink-active {
    color: #c0392b !important; font-weight: 700;
    background: rgba(192,57,43,0.08);
  }

  /* HERO */
  .re-hero {
    max-width: 720px; margin: 0 auto;
    padding: 60px 24px 40px;
    text-align: center;
  }
  .re-hero-badge {
    display: inline-flex; align-items: center; gap: 8px;
    font-size: 0.72rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
    color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08); border-radius: 20px;
    padding: 5px 14px; margin-bottom: 20px;
  }
  .re-badge-dot {
    width: 6px; height: 6px; border-radius: 50%; background: #c0392b;
    box-shadow: 0 0 6px #c0392b;
    animation: reBlinkDot 2s infinite;
  }
  @keyframes reBlinkDot { 0%,100%{opacity:1} 50%{opacity:0.3} }

  .re-hero-title {
    font-size: clamp(2rem, 6vw, 3.2rem);
    font-weight: 800; line-height: 1.1;
    color: #fff; letter-spacing: -0.03em;
    margin-bottom: 16px;
  }
  .re-hero-title em {
    font-style: normal; color: #c0392b;
  }
  .re-hero-sub {
    font-size: 0.88rem; color: rgba(255,255,255,0.38);
    line-height: 1.7;
  }

  /* FILTERS */
  .re-filters-wrap {
    max-width: 1100px; margin: 0 auto;
    padding: 0 24px 20px;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    flex-wrap: wrap;
  }
  .re-filters {
    display: flex; flex-wrap: wrap; gap: 8px;
  }
  .re-chip {
    padding: 7px 16px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.55);
    font-size: 0.78rem; font-weight: 600; font-family: 'Sora', sans-serif;
    cursor: pointer; transition: all 0.15s; white-space: nowrap;
  }
  .re-chip:hover { border-color: rgba(255,255,255,0.2); color: rgba(255,255,255,0.8); }
  .re-chip-active {
    background: rgba(192,57,43,0.15) !important;
    border-color: rgba(192,57,43,0.5) !important;
    color: #c0392b !important;
  }
  .re-count {
    font-size: 0.75rem; color: rgba(255,255,255,0.25);
    white-space: nowrap;
  }

  /* CONTENT */
  .re-content {
    max-width: 1100px; margin: 0 auto;
    padding: 0 24px 60px;
  }

  /* GRID */
  .re-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
  }

  /* CARD */
  .re-card {
    background: #111;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 14px;
    overflow: hidden;
    display: flex; flex-direction: column;
    transition: transform 0.18s, border-color 0.18s, box-shadow 0.18s;
  }
  .re-card:hover {
    transform: translateY(-3px);
    border-color: rgba(255,255,255,0.13);
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  }
  .re-card-featured {
    border-color: rgba(192,57,43,0.35);
    box-shadow: 0 0 0 1px rgba(192,57,43,0.12);
  }

  /* PHOTO */
  .re-card-photo {
    position: relative; height: 180px; overflow: hidden;
    background: #161616;
  }
  .re-card-img {
    width: 100%; height: 100%; object-fit: cover;
    transition: transform 0.3s;
  }
  .re-card:hover .re-card-img { transform: scale(1.04); }
  .re-card-photo-placeholder {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, #141414 0%, #1a1a1a 100%);
  }
  .re-placeholder-icon { font-size: 2.5rem; opacity: 0.5; }

  /* PHOTO BADGES */
  .re-badge-listing {
    position: absolute; top: 10px; left: 10px;
    font-size: 0.62rem; font-weight: 800; letter-spacing: 0.07em;
    padding: 3px 9px; border-radius: 5px;
  }
  .re-badge-sale {
    background: rgba(192,57,43,0.9); color: #fff;
  }
  .re-badge-rent {
    background: rgba(37,99,235,0.85); color: #fff;
  }
  .re-badge-featured {
    position: absolute; top: 10px; right: 10px;
    font-size: 0.62rem; font-weight: 700; letter-spacing: 0.05em;
    padding: 3px 9px; border-radius: 5px;
    background: rgba(212,160,23,0.9); color: #000;
  }

  /* BODY */
  .re-card-body {
    padding: 16px 16px 12px; flex: 1; display: flex; flex-direction: column; gap: 5px;
  }
  .re-card-type {
    font-size: 0.68rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.08em; color: rgba(255,255,255,0.3);
  }
  .re-card-title {
    font-size: 0.95rem; font-weight: 700; color: #fff;
    line-height: 1.3; margin-top: 2px;
  }
  .re-card-location {
    font-size: 0.78rem; color: rgba(255,255,255,0.4);
  }
  .re-card-stats {
    display: flex; align-items: baseline; gap: 10px;
    margin-top: 6px;
  }
  .re-card-price {
    font-size: 1.05rem; font-weight: 800; color: #c0392b;
  }
  .re-card-area {
    font-size: 0.75rem; color: rgba(255,255,255,0.35);
  }
  .re-card-desc {
    font-size: 0.78rem; color: rgba(255,255,255,0.38);
    line-height: 1.5; margin-top: 4px;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .re-card-poster {
    font-size: 0.73rem; color: rgba(255,255,255,0.25);
    margin-top: auto; padding-top: 8px;
  }

  /* ACTIONS */
  .re-card-actions {
    display: flex; gap: 8px;
    padding: 0 12px 12px;
  }
  .re-action-btn {
    display: flex; align-items: center; gap: 6px;
    flex: 1; justify-content: center;
    padding: 8px 10px; border-radius: 8px; border: none;
    font-size: 0.75rem; font-weight: 700; font-family: 'Sora', sans-serif;
    text-decoration: none; cursor: pointer; transition: background 0.15s;
  }
  .re-wa-btn {
    background: rgba(37,211,102,0.1); color: #25d366;
    border: 1px solid rgba(37,211,102,0.2);
  }
  .re-wa-btn:hover { background: rgba(37,211,102,0.18); }
  .re-call-btn {
    background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.6);
    border: 1px solid rgba(255,255,255,0.08);
  }
  .re-call-btn:hover { background: rgba(255,255,255,0.09); }

  /* SKELETON */
  .re-skeleton-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
  }
  .re-skeleton-card {
    height: 340px; border-radius: 14px;
    background: linear-gradient(90deg, #141414 25%, #1a1a1a 50%, #141414 75%);
    background-size: 200% 100%;
    animation: reSkeleton 1.4s infinite;
  }
  @keyframes reSkeleton {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  /* EMPTY */
  .re-empty {
    text-align: center; padding: 80px 20px;
    color: rgba(255,255,255,0.3); font-size: 0.88rem;
    display: flex; flex-direction: column; align-items: center; gap: 12px;
  }
  .re-empty-icon { font-size: 2.5rem; }
  .re-empty-reset {
    margin-top: 4px; padding: 8px 20px; border-radius: 8px;
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.5); font-size: 0.78rem; font-family: 'Sora', sans-serif;
    cursor: pointer; transition: background 0.15s;
  }
  .re-empty-reset:hover { background: rgba(255,255,255,0.08); }

  /* FOOTER */
  .re-footer {
    text-align: center; padding: 24px;
    border-top: 1px solid rgba(255,255,255,0.05);
  }
  .re-footer a {
    font-size: 0.78rem; color: rgba(255,255,255,0.25); text-decoration: none;
    transition: color 0.15s;
  }
  .re-footer a:hover { color: rgba(255,255,255,0.5); }

  /* MOBILE */
  @media (max-width: 640px) {
    .re-nav { padding: 0 16px; }
    .re-hero { padding: 40px 16px 28px; }
    .re-filters-wrap { padding: 0 16px 16px; }
    .re-content { padding: 0 16px 40px; }
    .re-grid { grid-template-columns: 1fr; }
    .re-count { display: none; }
  }
`;

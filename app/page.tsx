'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const CATEGORY_CHIPS = [
  { label: 'PG & Rentals', query: 'pg rental' },
  { label: 'Food', query: 'restaurant cafe food' },
  { label: 'Fitness', query: 'gym turf fitness' },
  { label: 'Study', query: 'coaching school study' },
  { label: 'Sports', query: 'turf sports football' },
];

const ROTATING_PLACEHOLDERS = [
  'Couple date night cafés in Dimapur',
  'Gym near PR Hill Kohima',
  'First time in Nagaland — hotels near Kisama',
  'Girls PG under Rs.4000 near 4th Mile',
  'Football turf available this Saturday',
];

const NAV_LINKS = [
  { label: 'Restaurants', query: 'restaurant' },
  { label: 'Hotels', query: 'hotel' },
  { label: 'PG & Rentals', query: 'pg rental' },
  { label: 'Services', query: 'service' },
  { label: 'Shopping', query: 'shop' },
];

const TRENDING_SEARCHES = [
  'Best momos in Kohima',
  'Budget hotels Dimapur',
  'Girls PG near 4th Mile',
  'Gym membership Kohima',
  'Turf booking this weekend',
];

type Business = {
  id: string;
  name: string;
  category: string;
  city: string;
  description?: string;
  photos?: string[];
  created_at: string;
  is_verified: boolean;
};

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [placeholder, setPlaceholder] = useState(ROTATING_PLACEHOLDERS[0]);
  const [featuredBusinesses, setFeaturedBusinesses] = useState<Business[]>([]);
  const [recentBusinesses, setRecentBusinesses] = useState<Business[]>([]);
  const [totalBusinesses, setTotalBusinesses] = useState(0);
  const [totalDistricts] = useState(17);
  const [totalCategories] = useState(15);
  const placeholderIndex = useRef(0);
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      placeholderIndex.current = (placeholderIndex.current + 1) % ROTATING_PLACEHOLDERS.length;
      setPlaceholder(ROTATING_PLACEHOLDERS[placeholderIndex.current]);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function fetchBusinesses() {
      const { data: featured } = await supabase
        .from('businesses')
        .select('*')
        .eq('is_active', true)
        .in('plan', ['basic', 'pro'])
        .order('created_at', { ascending: false })
        .limit(6);

      const { data: recent } = await supabase
        .from('businesses')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(6);

      const { count } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      setFeaturedBusinesses(featured || []);
      setRecentBusinesses(recent || []);
      setTotalBusinesses(count || 0);
    }
    fetchBusinesses();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const hasBusinesses = featuredBusinesses.length > 0 || recentBusinesses.length > 0;

  return (
    <main className="homepage">
      <style>{`
        .homepage {
          background: #0a0a0a;
          color: #e0e0e0;
          font-family: 'Sora', sans-serif;
          min-height: 100vh;
        }

        /* NAVBAR */
        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 clamp(16px, 4vw, 48px);
          height: 64px;
          background: rgba(10, 10, 10, 0.95);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid #1e1e1e;
        }
        .nav-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          line-height: 1;
        }
        .nav-logo-text {
          display: flex;
          flex-direction: column;
        }
        .nav-logo-name {
          font-family: 'Playfair Display', serif;
          font-size: 1.4rem;
          font-weight: 700;
          color: #fff;
          letter-spacing: 0.02em;
        }
        .nav-logo-sub {
          font-family: 'Sora', sans-serif;
          font-size: 0.55rem;
          letter-spacing: 0.35em;
          color: #888;
          text-transform: uppercase;
          margin-top: 1px;
        }
        .nav-links {
          display: flex;
          align-items: center;
          gap: clamp(12px, 2.5vw, 32px);
        }
        .nav-link {
          color: #aaa;
          text-decoration: none;
          font-size: 0.85rem;
          font-weight: 400;
          transition: color 0.2s;
          white-space: nowrap;
        }
        .nav-link:hover {
          color: #fff;
        }
        .nav-cta {
          background: #c0392b;
          color: #fff;
          text-decoration: none;
          padding: 8px 20px;
          font-size: 0.82rem;
          font-weight: 600;
          border-radius: 6px;
          transition: background 0.2s;
          white-space: nowrap;
        }
        .nav-cta:hover {
          background: #e74c3c;
        }

        /* HERO */
        .hero {
          padding: 160px 20px 80px;
          text-align: center;
          position: relative;
        }
        .hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at 50% 30%, rgba(192, 57, 43, 0.06) 0%, transparent 70%);
          pointer-events: none;
        }
        .hero-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(2.5rem, 6vw, 4.5rem);
          font-weight: 900;
          color: #fff;
          margin-bottom: 36px;
          line-height: 1.1;
          position: relative;
        }
        .hero-title em {
          font-style: italic;
          color: #c0392b;
        }
        .search-form {
          max-width: 680px;
          margin: 0 auto 28px;
          display: flex;
          position: relative;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #2a2a2a;
          background: #141414;
        }
        .search-form:focus-within {
          border-color: #c0392b;
          box-shadow: 0 0 0 3px rgba(192, 57, 43, 0.15);
        }
        .search-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          padding: 16px 20px;
          color: #fff;
          font-family: 'Sora', sans-serif;
          font-size: 0.95rem;
          min-width: 0;
        }
        .search-input::placeholder {
          color: #555;
          transition: opacity 0.3s;
        }
        .search-btn {
          background: #c0392b;
          border: none;
          padding: 0 32px;
          color: #fff;
          font-family: 'Sora', sans-serif;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .search-btn:hover {
          background: #e74c3c;
        }
        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          justify-content: center;
          position: relative;
        }
        .chip {
          background: #1a1a1a;
          border: 1px solid #2a2a2a;
          color: #bbb;
          padding: 8px 18px;
          font-size: 0.82rem;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Sora', sans-serif;
        }
        .chip:hover {
          border-color: #c0392b;
          color: #fff;
          background: rgba(192, 57, 43, 0.1);
        }

        /* CONTENT SECTION */
        .content-section {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px 80px;
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 40px;
          align-items: start;
        }

        /* LEFT COLUMN */
        .section-title {
          font-family: 'Playfair Display', serif;
          font-size: 1.4rem;
          font-weight: 700;
          color: #fff;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .section-title .dot {
          width: 8px;
          height: 8px;
          background: #c0392b;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .biz-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 16px;
          margin-bottom: 48px;
        }
        .biz-card {
          background: #141414;
          border: 1px solid #1e1e1e;
          border-radius: 10px;
          overflow: hidden;
          text-decoration: none;
          color: inherit;
          display: block;
          transition: transform 0.2s, border-color 0.2s;
        }
        .biz-card:hover {
          transform: translateY(-3px);
          border-color: #333;
        }
        .biz-photo {
          width: 100%;
          height: 150px;
          object-fit: cover;
          display: block;
        }
        .biz-photo-placeholder {
          width: 100%;
          height: 150px;
          background: linear-gradient(135deg, #1a1a1a, #111);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.2rem;
          color: #333;
        }
        .biz-body {
          padding: 14px 16px 16px;
        }
        .biz-cat {
          font-size: 0.7rem;
          color: #c0392b;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .biz-name {
          font-family: 'Playfair Display', serif;
          font-size: 1.05rem;
          color: #fff;
          margin-bottom: 4px;
          line-height: 1.3;
        }
        .biz-city {
          font-size: 0.78rem;
          color: #666;
          margin-bottom: 8px;
        }
        .biz-verified {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.7rem;
          color: #27ae60;
          font-weight: 500;
        }

        /* EMPTY STATE */
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          border: 1px dashed #2a2a2a;
          border-radius: 12px;
          margin-bottom: 48px;
        }
        .empty-state h3 {
          font-family: 'Playfair Display', serif;
          font-size: 1.3rem;
          color: #fff;
          margin-bottom: 10px;
        }
        .empty-state p {
          color: #666;
          font-size: 0.88rem;
          margin-bottom: 20px;
        }
        .empty-state a {
          display: inline-block;
          background: #c0392b;
          color: #fff;
          text-decoration: none;
          padding: 10px 24px;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 600;
          transition: background 0.2s;
        }
        .empty-state a:hover {
          background: #e74c3c;
        }

        /* RIGHT SIDEBAR */
        .sidebar {
          display: flex;
          flex-direction: column;
          gap: 24px;
          position: sticky;
          top: 84px;
        }
        .sidebar-card {
          background: #141414;
          border: 1px solid #1e1e1e;
          border-radius: 10px;
          padding: 20px;
        }
        .sidebar-card h4 {
          font-family: 'Playfair Display', serif;
          font-size: 1rem;
          color: #fff;
          margin-bottom: 16px;
        }
        .stat-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid #1a1a1a;
        }
        .stat-row:last-child {
          border-bottom: none;
        }
        .stat-label {
          font-size: 0.82rem;
          color: #888;
        }
        .stat-value {
          font-size: 1.1rem;
          font-weight: 700;
          color: #fff;
        }
        .register-cta-card {
          background: linear-gradient(135deg, #1a0a08, #141414);
          border: 1px solid #2a1510;
        }
        .register-cta-card h4 {
          color: #fff;
          margin-bottom: 8px;
        }
        .register-cta-card p {
          color: #888;
          font-size: 0.82rem;
          margin-bottom: 16px;
          line-height: 1.5;
        }
        .register-cta-btn {
          display: block;
          width: 100%;
          text-align: center;
          background: #c0392b;
          color: #fff;
          text-decoration: none;
          padding: 10px;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 600;
          transition: background 0.2s;
        }
        .register-cta-btn:hover {
          background: #e74c3c;
        }
        .trending-list {
          list-style: none;
          padding: 0;
        }
        .trending-list li {
          padding: 8px 0;
          border-bottom: 1px solid #1a1a1a;
        }
        .trending-list li:last-child {
          border-bottom: none;
        }
        .trending-list a {
          color: #bbb;
          text-decoration: none;
          font-size: 0.82rem;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: color 0.2s;
        }
        .trending-list a:hover {
          color: #c0392b;
        }
        .trending-list .trend-icon {
          color: #c0392b;
          font-size: 0.75rem;
        }

        /* FOOTER */
        .footer {
          background: #080808;
          border-top: 1px solid #1a1a1a;
          padding: 28px clamp(20px, 4vw, 48px);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .footer-logo {
          font-family: 'Playfair Display', serif;
          color: #fff;
          font-size: 1rem;
        }
        .footer-copy {
          color: #555;
          font-size: 0.75rem;
        }

        @media (max-width: 900px) {
          .content-section {
            grid-template-columns: 1fr;
          }
          .sidebar {
            position: static;
          }
          .nav-links {
            display: none;
          }
        }

        @media (max-width: 480px) {
          .hero-title {
            font-size: 2rem;
          }
          .search-form {
            flex-direction: column;
            border-radius: 10px;
          }
          .search-btn {
            padding: 14px;
            border-radius: 0 0 8px 8px;
          }
        }
      `}</style>

      {/* NAVBAR */}
      <nav className="navbar">
        <a href="/" className="nav-logo">
          <svg width="34" height="40" viewBox="0 0 120 140" fill="none"><defs><linearGradient id="pinG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#8B0000"/><stop offset="50%" stopColor="#c0392b"/><stop offset="100%" stopColor="#922B21"/></linearGradient><linearGradient id="feathG" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#8B0000"/><stop offset="60%" stopColor="#c0392b"/><stop offset="100%" stopColor="#1a1a1a"/></linearGradient><radialGradient id="glassG" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#1a1a1a"/><stop offset="100%" stopColor="#0d0d0d"/></radialGradient></defs><g transform="rotate(-35, 45, 30)"><path d="M20 55 C10 40 15 15 40 0 C50 10 55 30 40 45 Z" fill="url(#feathG)"/><circle cx="20" cy="55" r="3" fill="#D4A017"/><circle cx="20" cy="55" r="1.5" fill="#8B0000"/></g><path d="M60 18 C38 18 20 36 20 58 C20 82 60 120 60 120 C60 120 100 82 100 58 C100 36 82 18 60 18Z" fill="url(#pinG)"/><path d="M42 35 L60 48 L78 35" stroke="rgba(0,0,0,0.3)" strokeWidth="2" fill="none"/><path d="M50 72 L60 62 L70 72 L60 82 Z" stroke="rgba(212,160,23,0.5)" strokeWidth="1" fill="rgba(0,0,0,0.15)"/><path d="M47 88 L60 96 L73 88" stroke="rgba(212,160,23,0.3)" strokeWidth="1" fill="none"/><circle cx="60" cy="58" r="19" fill="url(#glassG)" stroke="white" strokeWidth="2.5"/><path d="M54 52 L68 66" stroke="white" strokeWidth="2.5" strokeLinecap="round"/><path d="M54 52 L54 60 L62 52 Z" fill="white"/><line x1="74" y1="72" x2="84" y2="82" stroke="white" strokeWidth="4" strokeLinecap="round"/></svg>
          <div className="nav-logo-text">
            <span className="nav-logo-name">Yana</span>
            <span className="nav-logo-sub">NAGALAND</span>
          </div>
        </a>
        <div className="nav-links">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={`/search?q=${encodeURIComponent(link.query)}`}
              className="nav-link"
            >
              {link.label}
            </a>
          ))}
        </div>
        <a href="/register" className="nav-cta">List your business</a>
      </nav>

      {/* HERO */}
      <section className="hero">
        <h1 className="hero-title">
          Find <em>anything</em> in Nagaland
        </h1>
        <form onSubmit={handleSearch} className="search-form">
          <input
            className="search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
          />
          <button type="submit" className="search-btn">Search</button>
        </form>
        <div className="chips">
          {CATEGORY_CHIPS.map((chip) => (
            <button
              key={chip.label}
              className="chip"
              onClick={() => router.push(`/search?q=${encodeURIComponent(chip.query)}`)}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </section>

      {/* TWO COLUMN CONTENT */}
      <div className="content-section">
        <div className="left-col">
          {/* Featured Businesses */}
          {hasBusinesses ? (
            <>
              {featuredBusinesses.length > 0 && (
                <>
                  <h2 className="section-title"><span className="dot" /> Featured Businesses</h2>
                  <div className="biz-grid">
                    {featuredBusinesses.map((biz) => (
                      <a key={biz.id} href={`/business/${biz.id}`} className="biz-card">
                        {biz.photos && biz.photos[0] ? (
                          <img src={biz.photos[0]} alt={biz.name} className="biz-photo" />
                        ) : (
                          <div className="biz-photo-placeholder">🏔️</div>
                        )}
                        <div className="biz-body">
                          <div className="biz-cat">{biz.category}</div>
                          <div className="biz-name">{biz.name}</div>
                          <div className="biz-city">📍 {biz.city}</div>
                          {biz.is_verified && (
                            <span className="biz-verified">✓ Verified</span>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                </>
              )}

              {recentBusinesses.length > 0 && (
                <>
                  <h2 className="section-title"><span className="dot" /> Recently Listed</h2>
                  <div className="biz-grid">
                    {recentBusinesses.map((biz) => (
                      <a key={biz.id} href={`/business/${biz.id}`} className="biz-card">
                        {biz.photos && biz.photos[0] ? (
                          <img src={biz.photos[0]} alt={biz.name} className="biz-photo" />
                        ) : (
                          <div className="biz-photo-placeholder">🏔️</div>
                        )}
                        <div className="biz-body">
                          <div className="biz-cat">{biz.category}</div>
                          <div className="biz-name">{biz.name}</div>
                          <div className="biz-city">📍 {biz.city}</div>
                          {biz.is_verified && (
                            <span className="biz-verified">✓ Verified</span>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="empty-state">
              <h3>Be the first to list your business</h3>
              <p>No businesses listed yet. Get discovered by thousands of people searching in Nagaland.</p>
              <a href="/register">List Your Business — Free</a>
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR */}
        <aside className="sidebar">
          {/* Platform Stats */}
          <div className="sidebar-card">
            <h4>Platform Stats</h4>
            <div className="stat-row">
              <span className="stat-label">Listed Businesses</span>
              <span className="stat-value">{totalBusinesses}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Districts Covered</span>
              <span className="stat-value">{totalDistricts}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Categories</span>
              <span className="stat-value">{totalCategories}</span>
            </div>
          </div>

          {/* Register CTA */}
          <div className="sidebar-card register-cta-card">
            <h4>Own a business in Nagaland?</h4>
            <p>Get found by thousands of people searching for services like yours. List for free.</p>
            <a href="/register" className="register-cta-btn">Register Your Business</a>
          </div>

          {/* Trending Searches */}
          <div className="sidebar-card">
            <h4>Trending Searches</h4>
            <ul className="trending-list">
              {TRENDING_SEARCHES.map((s) => (
                <li key={s}>
                  <a href={`/search?q=${encodeURIComponent(s)}`}>
                    <span className="trend-icon">↗</span>
                    {s}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      {/* FOOTER */}
      <footer className="footer">
        <span className="footer-logo">Yana Nagaland</span>
        <span className="footer-copy">© 2026 · Made with pride for Nagaland</span>
      </footer>
    </main>
  );
}

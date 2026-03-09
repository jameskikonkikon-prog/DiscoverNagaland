'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { supabase } from '@/lib/supabase';

const ROTATING_PLACEHOLDERS = [
  'Couple date night cafés in Dimapur…',
  'Gym near PR Hill Kohima with trainer…',
  'First time in Nagaland — hotels near Kisama…',
  'Girls PG under Rs.4000 near 4th Mile…',
  'Football turf available this Saturday…',
  'Best pork curry restaurant in Kohima…',
  '2BHK rental house Dimapur under Rs.8000…',
  'Quiet study space with AC Dimapur…',
  'Boys hostel near JN Aier College…',
  'Rooftop café with good view Dimapur…',
  'Hornbill Festival hotels near Kisama village…',
  'Budget gym under Rs.800 per month Dimapur…',
];

const SEARCH_CHIPS = [
  { emoji: '🌙', label: 'Date night cafés', query: 'Couple date night café Dimapur' },
  { emoji: '🏠', label: 'Girls PG · 4th Mile', query: 'Girls PG near 4th Mile Dimapur under Rs.4000' },
  { emoji: '💪', label: 'Gym with trainer', query: 'Gym with trainer Dimapur' },
  { emoji: '🏨', label: 'Hotels near Kisama', query: 'Hotels near Kisama Hornbill Festival' },
  { emoji: '⚽', label: 'Turf this weekend', query: 'Football turf available weekend Dimapur' },
  { emoji: '🍖', label: 'Naga food Kohima', query: 'Best Naga food pork curry restaurant Kohima' },
  { emoji: '📚', label: 'Study space AC', query: 'Quiet study space AC Dimapur' },
  { emoji: '🏡', label: 'Rental house 2BHK', query: '2BHK rental house Dimapur under Rs.8000' },
];

const NAV_QUICK = [
  { label: 'PG & Rentals', query: 'PG rooms and hostels Dimapur' },
  { label: 'Food', query: 'Best restaurants and cafés Dimapur Kohima' },
  { label: 'Fitness', query: 'Gyms and fitness centres Dimapur' },
  { label: 'Study', query: 'Study spaces and libraries Dimapur' },
  { label: 'Sports', query: 'Football turf and sports Dimapur' },
];

const CATEGORY_EMOJI: Record<string, string> = {
  restaurant: '🍽️', cafe: '☕', hotel: '🏨', pg: '🏠', hostel: '🏠',
  rental: '🏡', gym: '💪', turf: '⚽', shop: '🛍️', salon: '💇',
  coaching: '📚', school: '🎓', pharmacy: '💊', hospital: '🏥',
  clinic: '🏥', service: '🔧',
};

function getCategoryEmoji(category: string): string {
  const lower = (category || '').toLowerCase();
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJI)) {
    if (lower.includes(key)) return emoji;
  }
  return '🏪';
}

type Business = {
  id: string;
  name: string;
  category: string;
  city: string;
  area?: string | null;
  description?: string;
  photos?: string[];
  created_at: string;
  is_verified: boolean;
  plan?: string;
  phone?: string;
  whatsapp?: string;
  price_range?: string;
  rating?: number | null;
};

type CategoryCount = { category: string; count: number };

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [placeholder, setPlaceholder] = useState(ROTATING_PLACEHOLDERS[0]);
  const [featuredBusinesses, setFeaturedBusinesses] = useState<Business[]>([]);
  const [recentBusinesses, setRecentBusinesses] = useState<Business[]>([]);
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [totalBusinesses, setTotalBusinesses] = useState(0);
  const [totalCities, setTotalCities] = useState(0);
  const [totalCategories, setTotalCategories] = useState(0);
  const [earlyAccessSpots, setEarlyAccessSpots] = useState<number | null>(null);
  const [earlyAccessFull, setEarlyAccessFull] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const placeholderIndex = useRef(0);
  const router = useRouter();

  const supabaseBrowser = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  )[0];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      placeholderIndex.current = (placeholderIndex.current + 1) % ROTATING_PLACEHOLDERS.length;
      setPlaceholder(ROTATING_PLACEHOLDERS[placeholderIndex.current]);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function fetchData() {
      let featuredList: Business[] = [];
      const { data: featuredRows, error: featuredErr } = await supabase
        .from('businesses')
        .select('id, name, category, city, area, photos, price_range, plan, is_verified, created_at')
        .eq('is_active', true)
        .eq('featured', true)
        .order('created_at', { ascending: false })
        .limit(8);
      if (!featuredErr && featuredRows?.length) {
        featuredList = featuredRows as Business[];
      } else {
        const { data: planRows } = await supabase
          .from('businesses')
          .select('id, name, category, city, area, photos, price_range, plan, is_verified, created_at')
          .eq('is_active', true)
          .in('plan', ['plus', 'pro'])
          .order('created_at', { ascending: false })
          .limit(8);
        featuredList = (planRows || []) as Business[];
      }
      const featuredIds = featuredList.map((b) => b.id);

      let ratingsByBiz: Record<string, number> = {};
      if (featuredIds.length > 0) {
        const { data: reviews } = await supabase
          .from('reviews')
          .select('business_id, rating')
          .in('business_id', featuredIds);
        if (reviews?.length) {
          const sumCount: Record<string, { sum: number; n: number }> = {};
          reviews.forEach((r: { business_id: string; rating: number }) => {
            if (!sumCount[r.business_id]) sumCount[r.business_id] = { sum: 0, n: 0 };
            sumCount[r.business_id].sum += r.rating;
            sumCount[r.business_id].n += 1;
          });
          ratingsByBiz = Object.fromEntries(
            Object.entries(sumCount).map(([id, { sum, n }]) => [id, Math.round((sum / n) * 10) / 10])
          );
        }
      }

      const featuredWithRating = featuredList.map((b) => ({
        ...b,
        rating: ratingsByBiz[b.id] ?? null,
      }));
      setFeaturedBusinesses(featuredWithRating);

      const { data: recent } = await supabase
        .from('businesses')
        .select('id, name, category, city, area, photos, price_range, plan, is_verified, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(6);
      setRecentBusinesses((recent || []) as Business[]);

      const { data: allActive } = await supabase
        .from('businesses')
        .select('category, city')
        .eq('is_active', true);

      const list = allActive || [];
      setTotalBusinesses(list.length);
      setTotalCities(new Set(list.map((r: { city: string }) => r.city)).size);
      setTotalCategories(new Set(list.map((r: { category: string }) => r.category)).size);

      const categoryCounts: Record<string, number> = {};
      list.forEach((r: { category: string }) => {
        categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
      });
      setCategories(
        Object.entries(categoryCounts)
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count)
      );

      const spotsRes = await fetch('/api/founding-members');
      const spotsData = await spotsRes.json().catch(() => ({}));
      setEarlyAccessSpots(spotsData.spotsRemaining ?? spotsData.remaining ?? null);
      setEarlyAccessFull(!!spotsData.isFull);
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (!mounted) return;
    let isMounted = true;
    supabaseBrowser.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return;
        setLoggedIn(!!data.session);
      })
      .catch(() => {
        if (!isMounted) return;
        setLoggedIn(false);
      });
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      if (isMounted) setLoggedIn(!!session);
    });
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [mounted, supabaseBrowser]);

  const handleSearch = () => {
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const quickSearch = (q: string) => {
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  function getFeatAccent(index: number): string {
    return ['red', 'gold', 'green', 'dim'][index % 4];
  }
  function getTagClass(index: number): string {
    return ['tag-red', 'tag-gold', 'tag-green', 'tag-dim'][index % 4];
  }
  function getRecentBadge(biz: Business): { cls: string; label: string } {
    if (biz.is_verified) return { cls: 'r-verified', label: '✓ Verified' };
    if (biz.plan === 'plus' || biz.plan === 'pro') return { cls: 'r-hot', label: 'POPULAR' };
    return { cls: 'r-new', label: 'NEW' };
  }

  return (
    <>
      <style>{pageStyles}</style>

      {/* NAV */}
      <nav className="yana-nav">
        <a href="/" className="brand">
          <svg width="34" height="40" viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="pinG" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8B0000"/>
                <stop offset="50%" stopColor="#c0392b"/>
                <stop offset="100%" stopColor="#922B21"/>
              </linearGradient>
              <linearGradient id="feathG" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8B0000"/>
                <stop offset="60%" stopColor="#c0392b"/>
                <stop offset="100%" stopColor="#1a1a1a"/>
              </linearGradient>
              <radialGradient id="glassG" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#1a1a1a"/>
                <stop offset="100%" stopColor="#0d0d0d"/>
              </radialGradient>
            </defs>
            <g transform="rotate(-35, 45, 30)">
              <path d="M20 55 C10 40 15 15 40 0 C50 10 55 30 40 45 Z" fill="url(#feathG)"/>
              <line x1="20" y1="55" x2="38" y2="3" stroke="#1a1a1a" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
              <circle cx="20" cy="55" r="3" fill="#D4A017"/>
              <circle cx="20" cy="55" r="1.5" fill="#8B0000"/>
            </g>
            <path d="M60 18 C38 18 20 36 20 58 C20 82 60 120 60 120 C60 120 100 82 100 58 C100 36 82 18 60 18Z" fill="url(#pinG)"/>
            <path d="M42 35 L60 48 L78 35" stroke="rgba(0,0,0,0.3)" strokeWidth="2" fill="none" strokeLinejoin="round"/>
            <path d="M50 72 L60 62 L70 72 L60 82 Z" stroke="rgba(212,160,23,0.5)" strokeWidth="1" fill="rgba(0,0,0,0.15)"/>
            <path d="M47 88 L60 96 L73 88" stroke="rgba(212,160,23,0.3)" strokeWidth="1" fill="none"/>
            <path d="M60 18 C38 18 20 36 20 58 C20 82 60 120 60 120 C60 120 100 82 100 58 C100 36 82 18 60 18Z" fill="none" stroke="rgba(212,160,23,0.2)" strokeWidth="1"/>
            <circle cx="60" cy="58" r="19" fill="url(#glassG)" stroke="white" strokeWidth="2.5"/>
            <circle cx="60" cy="58" r="15" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
            <path d="M54 52 L68 66" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M54 52 L54 60 L62 52 Z" fill="white"/>
            <line x1="74" y1="72" x2="84" y2="82" stroke="white" strokeWidth="4" strokeLinecap="round"/>
            <circle cx="85" cy="83" r="2" fill="rgba(212,160,23,0.6)"/>
          </svg>
          <div className="wordmark">
            <div className="w-yana">Yana</div>
            <div className="w-naga">Nagaland</div>
          </div>
        </a>
        <div className="nav-links">
          {NAV_QUICK.map((n) => (
            <button key={n.label} className="nl" onClick={() => quickSearch(n.query)}>{n.label}</button>
          ))}
        </div>
        {!mounted ? (
          <span className="nav-avatar nav-avatar-placeholder" aria-hidden />
        ) : loggedIn ? (
          <>
            <a href="/dashboard" className="nav-cta-btn">Dashboard</a>
            <a href="/dashboard" className="nav-avatar" aria-label="Open dashboard">
              <span className="nav-avatar-icon">👤</span>
            </a>
          </>
        ) : (
          <>
            <a href="/login" className="nl" style={{ color: '#999' }}>Sign in</a>
            <a href="/register" className="nav-cta-btn">List your business</a>
          </>
        )}
      </nav>

      {/* HERO */}
      <div className="hero">
        <div className="hero-badge"><span className="badge-dot" />{"Nagaland's first AI directory"}</div>
        <h1>Find anything in<br/><em>Nagaland</em></h1>
        <p className="hero-sub">
          PG rooms · Gyms · Turfs · Cafés · Study spaces · Restaurants<br/>
          Describe exactly what you need — I know every street.
        </p>
        <div className="search-wrap">
          <div className="search-bar">
            <div className="s-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <input
              className="s-input"
              placeholder={placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
              autoComplete="off"
            />
            <button className="s-btn" onClick={handleSearch}>Search</button>
          </div>
          <div className="chips">
            {SEARCH_CHIPS.map((c) => (
              <div key={c.label} className="chip" onClick={() => quickSearch(c.query)}>
                {c.emoji} {c.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="main-grid">
        {/* LEFT COLUMN */}
        <div>
          {/* FEATURED */}
          <div className="sec-head">
            <span className="sec-title">Featured this week</span>
            <button className="sec-more" onClick={() => quickSearch('featured businesses Nagaland')}>See all →</button>
          </div>
          <div className="featured-grid">
            {featuredBusinesses.map((biz, i) => {
              const planVal = (biz.plan ?? '').toString().trim().toLowerCase();
              const isPlus = planVal === 'plus';
              console.log('[featured]', biz.name, 'plan:', biz.plan, '→ isPlus:', isPlus);
              return (
              <a key={biz.id} href={`/business/${biz.id}`} className={`feat ${getFeatAccent(i)}${isPlus ? ' feat-plus' : ''}`}>
                <div className="feat-photo">
                  {biz.photos && biz.photos[0] ? (
                    <>
                      <img src={biz.photos[0]} alt={biz.name} />
                      <div className="feat-photo-overlay" />
                    </>
                  ) : (
                    getCategoryEmoji(biz.category)
                  )}
                  {isPlus && <span className="feat-verified-badge">✓ Verified Business</span>}
                </div>
                <div className="feat-body">
                  <div className="feat-name">{biz.name}</div>
                  <div className="feat-detail">
                    {[biz.area, biz.city].filter(Boolean).join(' · ') || biz.city} · {isPlus ? '⭐ ' : ''}{biz.category}
                  </div>
                  <span className={`feat-tag ${getTagClass(i)}`}>
                    {biz.rating != null ? `⭐ ${biz.rating}` : biz.price_range || (biz.is_verified ? '✓ Verified' : biz.category)}
                  </span>
                </div>
              </a>
            );
            })}
          </div>

          {/* CATEGORIES */}
          {categories.length > 0 && (
            <>
              <div className="sec-head">
                <span className="sec-title">Categories</span>
                <button className="sec-more" onClick={() => quickSearch('')}>Browse all →</button>
              </div>
              <div className="categories-wrap">
                {categories.map(({ category, count }) => (
                  <button
                    key={category}
                    className="category-chip"
                    onClick={() => quickSearch(category)}
                  >
                    <span className="category-emoji">{getCategoryEmoji(category)}</span>
                    <span className="category-name">{category}</span>
                    <span className="category-count">{count}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* RECENTLY LISTED */}
          <div className="sec-head">
            <span className="sec-title">Recently listed</span>
            <button className="sec-more" onClick={() => quickSearch('new businesses Nagaland')}>View all →</button>
          </div>
          <div className="recent-list">
            {recentBusinesses.map((biz) => {
              const badge = getRecentBadge(biz);
              const isPlus = (biz.plan || '').toLowerCase() === 'plus';
              return (
                <a key={biz.id} href={`/business/${biz.id}`} className={`recent${isPlus ? ' recent-plus' : ''}`}>
                  <div className="recent-photo">
                    {biz.photos && biz.photos[0] ? (
                      <img src={biz.photos[0]} alt={biz.name} />
                    ) : (
                      getCategoryEmoji(biz.category)
                    )}
                    {isPlus && <span className="recent-verified-badge">✓ Verified</span>}
                  </div>
                  <div className="recent-info">
                    <div className="recent-name">{biz.name}</div>
                    <div className="recent-meta">
                      {[biz.area, biz.city].filter(Boolean).join(' · ') || biz.city} · {isPlus ? '⭐ ' : ''}{biz.category}
                      {biz.price_range ? ` · ${biz.price_range}` : ''}
                    </div>
                  </div>
                  <span className={`rbadge ${badge.cls}`}>{badge.label}</span>
                </a>
              );
            })}
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="sidebar">
          {/* LIVE STATS */}
          <div className="sec-head"><span className="sec-title">Platform stats</span></div>
          <div className="live-row"><div className="live-dot" />From Supabase</div>
          <div className="stats-grid stats-three">
            <div className="stat s1">
              <div className="stat-icon">🏪</div>
              <div className="stat-val gold">{totalBusinesses}</div>
              <div className="stat-lbl">Businesses listed</div>
            </div>
            <div className="stat s2">
              <div className="stat-icon">📍</div>
              <div className="stat-val red">{totalCities}</div>
              <div className="stat-lbl">Cities</div>
            </div>
            <div className="stat s3">
              <div className="stat-icon">📂</div>
              <div className="stat-val grn">{totalCategories}</div>
              <div className="stat-lbl">Categories</div>
            </div>
          </div>

          {/* CTA */}
          <div className="cta-box">
            <div className="cta-icon">🏪</div>
            <div className="cta-title">Own a business?</div>
            {earlyAccessSpots !== null && !earlyAccessFull && (
              <div className={`cta-urgency ${earlyAccessSpots < 20 ? 'cta-urgency-red' : ''}`}>
                🔥 Only {earlyAccessSpots} Early Access spots left — Get Pro free for your first month
              </div>
            )}
            {earlyAccessFull && (
              <div className="cta-urgency">Early Access full — Pro now ₹299/month</div>
            )}
            <div className="cta-sub">Get found by thousands searching in Nagaland.</div>
            <a href="/register" className="cta-btn">List your business free</a>
            <span className="cta-free">No credit card · No contract · Cancel anytime</span>
            <a href="/login" className="cta-signin">Already own a business? Sign in</a>
          </div>

          {/* TOP CATEGORIES (real data) */}
          {categories.length > 0 && (
            <>
              <div className="sec-head"><span className="sec-title">Top categories</span></div>
              <div className="trending">
                {categories.slice(0, 6).map(({ category, count }, i) => (
                  <div key={category} className="trend" onClick={() => quickSearch(category)}>
                    <span className="trend-n">{i + 1}</span>
                    <span className="trend-t">{getCategoryEmoji(category)} {category}</span>
                    <span className="trend-c">{count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <footer className="yana-footer">
        Yana Nagaland · Built for Nagaland · Powered by Claude AI · yananagaland.com
      </footer>
    </>
  );
}

const pageStyles = `
  /* ── NAV ── */
  .yana-nav{
    position:sticky;top:0;z-index:100;
    background:rgba(10,10,10,0.94);
    backdrop-filter:blur(20px);
    -webkit-backdrop-filter:blur(20px);
    border-bottom:1px solid var(--border);
    padding:0 28px;
    height:60px;
    display:flex;align-items:center;justify-content:space-between;
  }
  .brand{display:flex;align-items:center;gap:10px;cursor:pointer;text-decoration:none;color:inherit;}
  .wordmark{display:flex;flex-direction:column;}
  .w-yana{font-family:'Playfair Display',serif;font-size:20px;color:var(--white);letter-spacing:1.5px;line-height:1;}
  .w-naga{font-size:9px;letter-spacing:4px;text-transform:uppercase;color:rgba(255,255,255,0.3);margin-top:2px;}
  .nav-links{display:flex;gap:2px;}
  .nl{padding:7px 13px;font-size:12px;color:var(--muted);border-radius:6px;font-weight:500;cursor:pointer;transition:all 0.15s;background:none;border:none;font-family:'Sora',sans-serif;}
  .nl:hover{color:var(--white);background:rgba(255,255,255,0.05);}
  .nav-cta-btn{
    padding:9px 20px;
    background:var(--red);
    border:none;border-radius:20px;
    font-size:12px;color:white;font-weight:700;
    cursor:pointer;transition:all 0.15s;
    font-family:'Sora',sans-serif;letter-spacing:0.3px;
    box-shadow:0 4px 16px rgba(192,57,43,0.25);
    text-decoration:none;
  }
  .nav-cta-btn:hover{background:var(--red2);transform:translateY(-1px);}
  .nav-avatar{
    width:32px;
    height:32px;
    border-radius:999px;
    background:rgba(255,255,255,0.04);
    border:1px solid var(--border);
    display:flex;
    align-items:center;
    justify-content:center;
    margin-left:10px;
    cursor:pointer;
    text-decoration:none;
    color:var(--muted);
    transition:background 0.15s,border-color 0.15s,color 0.15s,transform 0.1s;
  }
  .nav-avatar:hover{
    background:var(--red-bg);
    border-color:var(--red);
    color:#fff;
    transform:translateY(-1px);
  }
  .nav-avatar-icon{font-size:0.9rem;}
  .nav-avatar-placeholder{pointer-events:none;visibility:hidden;}

  /* ── HERO ── */
  .hero{
    position:relative;z-index:1;
    padding:72px 28px 52px;
    text-align:center;
    max-width:820px;
    margin:0 auto;
  }
  .hero-badge{
    display:inline-flex;align-items:center;gap:8px;
    padding:5px 16px;
    background:var(--red-bg);
    border:1px solid rgba(192,57,43,0.2);
    border-radius:20px;
    font-size:11px;color:var(--red);
    letter-spacing:1.5px;text-transform:uppercase;font-weight:600;
    margin-bottom:24px;
    animation:fadeUp 0.5s ease both;
  }
  .badge-dot{width:5px;height:5px;background:var(--red);border-radius:50%;animation:blink 2s infinite;display:inline-block;}
  .hero h1{
    font-family:'Playfair Display',serif;
    font-size:clamp(34px,5.5vw,58px);
    font-weight:700;line-height:1.12;
    margin-bottom:14px;letter-spacing:-0.3px;
    animation:fadeUp 0.5s 0.1s ease both;
  }
  .hero h1 em{
    font-style:italic;
    color:var(--red);
  }
  .hero-sub{
    font-size:15px;color:var(--muted);font-weight:300;
    line-height:1.7;margin-bottom:40px;
    animation:fadeUp 0.5s 0.2s ease both;
  }

  /* ── SEARCH ── */
  .search-wrap{
    max-width:660px;margin:0 auto;
    animation:fadeUp 0.5s 0.3s ease both;
  }
  .search-bar{
    display:flex;align-items:center;
    background:var(--bg3);
    border:1.5px solid var(--border2);
    border-radius:14px;overflow:hidden;
    box-shadow:0 8px 40px rgba(0,0,0,0.4);
    transition:all 0.2s;
  }
  .search-bar:focus-within{
    border-color:var(--red);
    box-shadow:0 8px 40px rgba(0,0,0,0.4),0 0 0 3px rgba(192,57,43,0.1);
  }
  .s-icon{padding:0 18px;color:var(--muted);display:flex;align-items:center;flex-shrink:0;}
  .s-input{
    flex:1;background:none;border:none;outline:none;
    font-family:'Sora',sans-serif;
    font-size:15px;font-weight:300;
    color:var(--white);padding:20px 0;letter-spacing:0.2px;
  }
  .s-input::placeholder{color:rgba(255,255,255,0.2);}
  .s-btn{
    margin:6px;padding:12px 26px;
    background:var(--red);border:none;border-radius:10px;
    font-size:13px;color:white;font-weight:700;
    cursor:pointer;transition:all 0.15s;
    font-family:'Sora',sans-serif;letter-spacing:0.3px;
    white-space:nowrap;flex-shrink:0;
    box-shadow:0 4px 14px rgba(192,57,43,0.3);
  }
  .s-btn:hover{background:var(--red2);}
  .chips{
    display:flex;flex-wrap:wrap;gap:8px;
    margin-top:18px;justify-content:center;
    animation:fadeUp 0.5s 0.4s ease both;
  }
  .chip{
    padding:7px 15px;
    background:rgba(255,255,255,0.04);
    border:1px solid var(--border);
    border-radius:20px;
    font-size:12px;color:var(--muted);
    cursor:pointer;transition:all 0.15s;
    font-family:'Sora',sans-serif;font-weight:400;
  }
  .chip:hover{background:var(--red-bg);border-color:rgba(192,57,43,0.25);color:rgba(255,255,255,0.8);}

  /* ── MAIN GRID ── */
  .main-grid{
    position:relative;z-index:1;
    max-width:1100px;margin:0 auto;
    padding:0 28px 60px;
    display:grid;
    grid-template-columns:1fr 320px;
    gap:24px;
  }
  .sec-head{
    display:flex;align-items:center;justify-content:space-between;
    margin-bottom:14px;
  }
  .sec-title{
    font-size:11px;font-weight:700;
    letter-spacing:2px;text-transform:uppercase;color:var(--muted);
  }
  .sec-more{
    font-size:11px;color:var(--red);cursor:pointer;
    font-weight:600;background:none;border:none;
    font-family:'Sora',sans-serif;
  }

  /* ── FEATURED ── */
  .featured-grid{
    display:grid;grid-template-columns:1fr 1fr;gap:12px;
    margin-bottom:28px;
  }
  .feat{
    background:var(--bg2);
    border:1px solid var(--border);
    border-radius:12px;
    overflow:hidden;
    cursor:pointer;transition:all 0.2s;
    position:relative;
    text-decoration:none;color:inherit;display:block;
  }
  .feat::before{
    content:'';position:absolute;top:0;left:0;right:0;height:2px;
  }
  .feat.red::before{background:linear-gradient(90deg,var(--red),transparent);}
  .feat.gold::before{background:linear-gradient(90deg,var(--gold),transparent);}
  .feat.green::before{background:linear-gradient(90deg,#25d366,transparent);}
  .feat.dim::before{background:linear-gradient(90deg,rgba(255,255,255,0.2),transparent);}
  .feat:hover{background:var(--bg3);border-color:var(--border2);transform:translateY(-2px);box-shadow:0 12px 32px rgba(0,0,0,0.3);}
  .feat-plus{border-color:rgba(192,57,43,0.3);}
  .feat-plus:hover{border-color:rgba(192,57,43,0.5);}
  .feat-photo{
    width:100%;height:110px;
    background:linear-gradient(135deg,#1a1a1a,#222);
    display:flex;align-items:center;justify-content:center;
    font-size:32px;position:relative;overflow:hidden;
  }
  .feat-photo img{width:100%;height:100%;object-fit:cover;position:absolute;inset:0;}
  .feat-photo-overlay{
    position:absolute;inset:0;
    background:linear-gradient(transparent 40%,rgba(0,0,0,0.6));
  }
  .feat-verified-badge{
    position:absolute;bottom:6px;left:8px;
    padding:3px 8px;border-radius:999px;
    background:white;
    color:#b8860b;
    border:1.5px solid #d4af37;
    box-shadow:0 2px 8px rgba(212,175,55,0.3);
    font-family:'Sora',sans-serif;
    font-size:11px;font-weight:700;
    white-space:nowrap;
  }
  .feat-body{padding:12px 14px;}
  .feat-name{font-size:13px;font-weight:700;color:var(--white);margin-bottom:3px;}
  .feat-detail{font-size:11.5px;color:var(--muted);line-height:1.5;margin-bottom:8px;}
  .feat-tag{
    display:inline-block;font-size:10px;padding:3px 8px;border-radius:4px;font-weight:600;
  }
  .tag-red{background:var(--red-bg);color:var(--red);}
  .tag-gold{background:var(--gold-bg);color:var(--gold);}
  .tag-green{background:var(--green-bg);color:var(--green);}
  .tag-dim{background:rgba(255,255,255,0.06);color:var(--muted);}

  /* ── RECENT LIST ── */
  .recent-list{display:flex;flex-direction:column;gap:8px;margin-bottom:28px;}
  .recent{
    background:var(--bg2);border:1px solid var(--border);
    border-radius:10px;padding:12px 14px;
    display:flex;align-items:center;gap:12px;
    cursor:pointer;transition:all 0.15s;
    text-decoration:none;color:inherit;
  }
  .recent:hover{background:var(--bg3);border-color:var(--border2);}
  .recent-plus{border-color:rgba(192,57,43,0.3);}
  .recent-plus:hover{border-color:rgba(192,57,43,0.5);}
  .recent-photo{
    width:44px;height:44px;
    background:var(--bg3);border-radius:10px;
    display:grid;place-items:center;font-size:20px;
    flex-shrink:0;border:1px solid var(--border);
    overflow:hidden;position:relative;
  }
  .recent-photo img{width:100%;height:100%;object-fit:cover;position:absolute;inset:0;}
  .recent-verified-badge{
    position:absolute;bottom:3px;left:3px;
    padding:2px 5px;border-radius:999px;
    background:white;
    color:#b8860b;
    border:1.5px solid #d4af37;
    box-shadow:0 2px 8px rgba(212,175,55,0.3);
    font-size:8px;font-weight:700;
    font-family:'Sora',sans-serif;
    white-space:nowrap;
  }
  .recent-info{flex:1;min-width:0;}
  .recent-name{font-size:13px;font-weight:600;color:var(--white);margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .recent-meta{font-size:11.5px;color:var(--muted);font-weight:300;}
  .rbadge{font-size:10px;padding:3px 8px;border-radius:4px;font-weight:700;white-space:nowrap;flex-shrink:0;}
  .r-new{background:var(--red-bg);color:var(--red);}
  .r-hot{background:var(--gold-bg);color:var(--gold);}
  .r-verified{background:var(--green-bg);color:var(--green);}

  /* ── CATEGORIES ── */
  .categories-wrap{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:28px;}
  .category-chip{
    display:inline-flex;align-items:center;gap:6px;
    padding:8px 14px;
    background:var(--bg2);border:1px solid var(--border);
    border-radius:10px;cursor:pointer;transition:all 0.15s;
    font-family:'Sora',sans-serif;font-size:12px;color:var(--off);
  }
  .category-chip:hover{background:var(--bg3);border-color:var(--border2);color:var(--white);}
  .category-emoji{font-size:14px;}
  .category-name{font-weight:500;}
  .category-count{font-size:11px;color:var(--muted);margin-left:2px;}

  /* ── SIDEBAR ── */
  .sidebar{}
  .stats-grid{
    display:grid;grid-template-columns:1fr 1fr;gap:8px;
    margin-bottom:20px;
  }
  .stats-grid.stats-three{grid-template-columns:1fr 1fr 1fr;}
  .stat{
    background:var(--bg2);border:1px solid var(--border);
    border-radius:10px;padding:16px 12px;text-align:center;
    position:relative;overflow:hidden;
    transition:all 0.15s;
  }
  .stat::before{
    content:'';position:absolute;top:0;left:0;right:0;height:2px;
  }
  .stat.s1::before{background:linear-gradient(90deg,var(--red),transparent);}
  .stat.s2::before{background:linear-gradient(90deg,var(--gold),transparent);}
  .stat.s3::before{background:linear-gradient(90deg,#25d366,transparent);}
  .stat.s4::before{background:linear-gradient(90deg,rgba(255,255,255,0.3),transparent);}
  .stat:hover{background:var(--bg3);}
  .stat-icon{font-size:18px;margin-bottom:6px;}
  .stat-val{
    font-family:'Playfair Display',serif;
    font-size:26px;font-weight:700;line-height:1;margin-bottom:4px;
  }
  .stat-val.red{color:var(--red);}
  .stat-val.gold{color:var(--gold);}
  .stat-val.grn{color:#25d366;}
  .stat-lbl{font-size:10.5px;color:var(--muted);line-height:1.4;}
  .stat-change{
    display:inline-flex;align-items:center;gap:3px;
    margin-top:5px;font-size:10px;font-weight:600;
    padding:2px 6px;border-radius:6px;
  }
  .up{background:rgba(37,211,102,0.1);color:#25d366;}
  .live-row{
    display:flex;align-items:center;gap:6px;
    font-size:10px;color:var(--muted2);
    letter-spacing:1px;text-transform:uppercase;
    margin-bottom:12px;
  }
  .live-dot{width:5px;height:5px;background:#25d366;border-radius:50%;animation:blink 2s infinite;}

  /* Register CTA */
  .cta-box{
    background:linear-gradient(135deg,#160a08,#0f0a05);
    border:1px solid rgba(192,57,43,0.2);
    border-radius:12px;padding:20px;
    margin-bottom:20px;text-align:center;
  }
  .cta-icon{font-size:26px;margin-bottom:10px;}
  .cta-title{font-size:13.5px;font-weight:700;color:var(--white);margin-bottom:6px;}
  .cta-sub{font-size:12px;color:var(--muted);line-height:1.6;margin-bottom:14px;font-weight:300;}
  .cta-btn{
    display:block;width:100%;padding:11px;background:var(--red);
    border:none;border-radius:8px;font-size:13px;
    color:white;font-weight:700;cursor:pointer;
    font-family:'Sora',sans-serif;transition:all 0.15s;
    text-decoration:none;text-align:center;
  }
  .cta-btn:hover{background:var(--red2);}
  .cta-urgency{font-size:11px;font-weight:700;margin-bottom:8px;color:var(--muted);}
  .cta-urgency-red{color:var(--red);}
  .cta-free{font-size:10.5px;color:var(--muted2);margin-top:8px;display:block;}
  .cta-signin{display:block;margin-top:12px;font-size:0.8rem;color:var(--muted);text-decoration:none;transition:color 0.2s;}
  .cta-signin:hover{color:var(--red);text-decoration:underline;}

  /* Trending */
  .trending{
    background:var(--bg2);border:1px solid var(--border);
    border-radius:12px;overflow:hidden;
  }
  .trend{
    display:flex;align-items:center;gap:12px;
    padding:12px 16px;border-bottom:1px solid var(--border);
    cursor:pointer;transition:background 0.15s;
  }
  .trend:last-child{border-bottom:none;}
  .trend:hover{background:rgba(255,255,255,0.02);}
  .trend-n{font-size:12px;font-weight:700;color:var(--muted2);min-width:16px;}
  .trend-n.hot{color:var(--red);}
  .trend-t{flex:1;font-size:12.5px;color:var(--off);}
  .trend-c{font-size:11px;color:var(--muted);font-weight:300;}

  /* Footer */
  .yana-footer{
    position:relative;z-index:1;
    text-align:center;padding:24px;
    font-size:11px;color:var(--muted2);letter-spacing:0.5px;font-weight:300;
    border-top:1px solid var(--border);
  }

  /* Responsive */
  @media(max-width:860px){
    .main-grid{grid-template-columns:1fr;}
    .sidebar{display:none;}
  }
  @media(max-width:520px){
    .yana-nav{padding:0 16px;}
    .nav-links{display:none;}
    .hero{padding:48px 16px 36px;}
    .main-grid{padding:0 16px 40px;}
    .featured-grid{grid-template-columns:1fr;}
  }
`;

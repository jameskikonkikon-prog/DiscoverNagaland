'use client';

import { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Business = {
  id: string;
  name: string;
  category: string;
  city: string;
  area?: string | null;
  description?: string | null;
  photos?: string[] | null;
  phone?: string;
  whatsapp?: string;
  is_verified?: boolean;
  verified?: boolean;
  opening_hours?: string | null;
  price_range?: string | null;
  price_min?: number | null;
  plan?: string;
};

function SearchPageInner() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedCity, setSelectedCity] = useState("");
  const [detectedCity, setDetectedCity] = useState<string | null>(null);
  const [detectedPrice, setDetectedPrice] = useState<number | null>(null);
  const [relatedResults, setRelatedResults] = useState<Business[]>([]);
  const [correctedQuery, setCorrectedQuery] = useState<string | null>(null);
  const [filterOpenNow, setFilterOpenNow] = useState(false);
  const [filterCity, setFilterCity] = useState<"" | "Kohima" | "Dimapur">("");
  const [filterBudget, setFilterBudget] = useState(false);
  const [filterPremium, setFilterPremium] = useState(false);
  const [filterVerified, setFilterVerified] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [savedBizIds, setSavedBizIds] = useState<Set<string>>(new Set());

  const TRENDING_CHIPS = ["Cafes Kohima", "PG rooms", "Gyms", "Turfs", "Hotels Dimapur", "Study space"];

  const searchParams = useSearchParams();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const q = searchParams.get("q") || "";
    const isFeatured = searchParams.get("featured") === "true";
    if (isFeatured) {
      doSearch("", "", true);
    } else if (q) {
      setQuery(q);
      doSearch(q, "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let isMounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!isMounted) return;
      const isLoggedIn = !!data.session;
      setLoggedIn(isLoggedIn);
      if (isLoggedIn) {
        try {
          const res = await fetch('/api/saved');
          if (res.ok && isMounted) {
            const json = await res.json();
            const ids = new Set<string>(
              (json.saved ?? [])
                .filter((s: { business_id: string | null }) => s.business_id)
                .map((s: { business_id: string }) => s.business_id)
            );
            setSavedBizIds(ids);
          }
        } catch { /* ignore */ }
      }
    }).catch(() => { if (isMounted) setLoggedIn(false); });
    return () => { isMounted = false; };
  }, []);

  async function doSearch(q: string, city?: string, featuredOnly?: boolean) {
    setLoading(true);
    setHasSearched(true);
    setRelatedResults([]);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q);
      if (city) params.set("city", city);
      if (featuredOnly) params.set("featured", "true");
      const res = await fetch(`/api/search?${params}`);
      const json = await res.json();
      setDetectedCity(json.detectedCity || null);
      setDetectedPrice(json.detectedPrice ?? null);
      setResults(json.businesses ?? []);
      setCorrectedQuery(json.correctedQuery ?? null);
      setRelatedResults(json.relatedResults ?? []);
      setFilterOpenNow(false);
      setFilterCity("");
      setFilterBudget(false);
      setFilterPremium(false);
      setFilterVerified(false);
    } finally {
      setLoading(false);
    }
  }

  function applyFilterChips(list: Business[]): Business[] {
    return list.filter((b) => {
      if (filterOpenNow && !(b.opening_hours && b.opening_hours.trim() !== "")) return false;
      if (filterCity && b.city !== filterCity) return false;
      if (filterBudget) {
        const pr = (b.price_range || "").toLowerCase();
        const low = b.price_min != null && b.price_min < 500;
        if (pr !== "budget" && pr !== "affordable" && !low) return false;
      }
      if (filterPremium) {
        const pr = (b.price_range || "").toLowerCase();
        const plus = (b.plan || "").toLowerCase() === "plus";
        if (pr !== "premium" && !plus) return false;
      }
      if (filterVerified && !b.is_verified && !(b as Business & { verified?: boolean }).verified) return false;
      return true;
    });
  }

  const filteredResults = results.length > 0 ? applyFilterChips(results) : results;
  const hasActiveFilter = filterOpenNow || filterCity || filterBudget || filterPremium || filterVerified;

  function toggleFilterCity(city: "" | "Kohima" | "Dimapur") {
    setFilterCity((c) => (c === city ? "" : city));
  }

  function getBizDescription(biz: Business): string {
    if (biz.description && biz.description.trim() !== "") return biz.description;
    const loc = [biz.area, biz.city].filter(Boolean).join(", ") || biz.city;
    return `${biz.category} in ${loc}`;
  }

  function getBizPhotoUrl(biz: Business): string | null {
    const p = biz.photos;
    if (Array.isArray(p) && p.length > 0 && p[0]) return p[0];
    return null;
  }

  function handleInput(val: string) {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val, selectedCity), 400);
  }

  const activeCity = selectedCity || detectedCity;

  function getWhatsAppUrl(biz: Business) {
    const num = biz.whatsapp || biz.phone;
    if (!num) return null;
    const clean = num.replace(/\D/g, '');
    const formatted = clean.startsWith('91') ? clean : `91${clean}`;
    return `https://wa.me/${formatted}?text=${encodeURIComponent(`Hi, I found ${biz.name} on Yana Nagaland and would like to know more.`)}`;
  }

  function getCallUrl(biz: Business) {
    if (!biz.phone) return null;
    return `tel:${biz.phone}`;
  }

  async function toggleSaveBiz(bizId: string) {
    if (!loggedIn) { window.location.href = `/login?redirect=/search`; return; }
    const isSaved = savedBizIds.has(bizId);
    setSavedBizIds(prev => {
      const next = new Set(prev);
      if (isSaved) next.delete(bizId); else next.add(bizId);
      return next;
    });
    if (isSaved) {
      await fetch(`/api/saved?business_id=${bizId}`, { method: 'DELETE' });
    } else {
      await fetch('/api/saved', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ business_id: bizId }) });
    }
  }

  const CATEGORY_EMOJI: Record<string, string> = {
    restaurant: '🍽️', cafe: '☕', hotel: '🏨', pg: '🏠', hostel: '🏠',
    rental: '🏡', rental_house: '🏡', gym: '💪', turf: '⚽', shop: '🛍️',
    salon: '💇', coaching: '📚', school: '🎓', pharmacy: '💊',
    hospital: '🏥', clinic: '🏥', service: '🔧',
  };

  function renderCard(biz: Business) {
    const isVerified = !!(biz.is_verified || (biz as Business & { verified?: boolean }).verified);
    const isPlus = (biz.plan || "").toLowerCase() === "plus";
    const photoUrl = getBizPhotoUrl(biz);
    const emoji = CATEGORY_EMOJI[(biz.category || '').toLowerCase()] ?? '🏪';
    const location = [biz.area, biz.city].filter(Boolean).join(', ') || biz.city;

    return (
      <div key={biz.id} className={`biz-card${isPlus ? " biz-card-plus" : ""}`}>
        <Link href={`/business/${biz.id}`} className="biz-card-link">
          <div className="biz-photo-wrap">
            {photoUrl ? (
              <img src={photoUrl} alt={biz.name} className="biz-photo" />
            ) : (
              <div className="biz-photo-placeholder">
                <span className="biz-placeholder-emoji">{emoji}</span>
              </div>
            )}
          </div>
          <div className="biz-body">
            <div className="biz-top-row">
              <span className="biz-category">{biz.category}</span>
              {isVerified && <span className="biz-verified-badge">✓ Verified</span>}
            </div>
            <div className="biz-name">{biz.name}</div>
            <div className="biz-city">📍 {location}</div>
            <div className="biz-desc">{getBizDescription(biz)}</div>
          </div>
        </Link>
        <div className="biz-actions">
          {getWhatsAppUrl(biz) && (
            <a href={getWhatsAppUrl(biz)!} target="_blank" rel="noopener noreferrer" className="action-btn whatsapp-btn">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </a>
          )}
          {getCallUrl(biz) && (
            <a href={getCallUrl(biz)!} className="action-btn call-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
              Call
            </a>
          )}
          <button
            className={`action-btn save-btn${savedBizIds.has(biz.id) ? ' saved' : ''}`}
            onClick={() => toggleSaveBiz(biz.id)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill={savedBizIds.has(biz.id) ? '#c0392b' : 'none'} stroke={savedBizIds.has(biz.id) ? '#c0392b' : 'currentColor'}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            {savedBizIds.has(biz.id) ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>
    );
  }

  if (!mounted) return <div style={{ background: '#0a0a0a', minHeight: '100vh' }} />;

  return (
    <>
      <style>{styles}</style>
      <div className="search-page">

        {/* ── NAVBAR ── */}
        <header className="search-header">
          <Link href="/" className="logo-link">
            <svg width="30" height="36" viewBox="0 0 120 140" fill="none"><defs><linearGradient id="pinG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#8B0000"/><stop offset="50%" stopColor="#c0392b"/><stop offset="100%" stopColor="#922B21"/></linearGradient><linearGradient id="feathG" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#8B0000"/><stop offset="60%" stopColor="#c0392b"/><stop offset="100%" stopColor="#1a1a1a"/></linearGradient><radialGradient id="glassG" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#1a1a1a"/><stop offset="100%" stopColor="#0d0d0d"/></radialGradient></defs><g transform="rotate(-35, 45, 30)"><path d="M20 55 C10 40 15 15 40 0 C50 10 55 30 40 45 Z" fill="url(#feathG)"/><circle cx="20" cy="55" r="3" fill="#D4A017"/><circle cx="20" cy="55" r="1.5" fill="#8B0000"/></g><path d="M60 18 C38 18 20 36 20 58 C20 82 60 120 60 120 C60 120 100 82 100 58 C100 36 82 18 60 18Z" fill="url(#pinG)"/><path d="M42 35 L60 48 L78 35" stroke="rgba(0,0,0,0.3)" strokeWidth="2" fill="none"/><path d="M50 72 L60 62 L70 72 L60 82 Z" stroke="rgba(212,160,23,0.5)" strokeWidth="1" fill="rgba(0,0,0,0.15)"/><path d="M47 88 L60 96 L73 88" stroke="rgba(212,160,23,0.3)" strokeWidth="1" fill="none"/><circle cx="60" cy="58" r="19" fill="url(#glassG)" stroke="white" strokeWidth="2.5"/><path d="M54 52 L68 66" stroke="white" strokeWidth="2.5" strokeLinecap="round"/><path d="M54 52 L54 60 L62 52 Z" fill="white"/><line x1="74" y1="72" x2="84" y2="82" stroke="white" strokeWidth="4" strokeLinecap="round"/></svg>
            <div className="logo-text">
              <span className="logo-yana">Yana</span>
              <span className="logo-sub">NAGALAND</span>
            </div>
          </Link>

          <div style={{ flex: 1 }} />

          {/* Desktop nav */}
          <div className="nav-desktop">
            {!mounted ? (
              <span className="nav-avatar nav-avatar-placeholder" aria-hidden="true" />
            ) : loggedIn ? (
              <>
                <Link href="/account" className="list-btn">My Account</Link>
                <Link href="/account" className="nav-avatar" aria-label="My account">
                  <span>👤</span>
                </Link>
              </>
            ) : (
              <Link href="/register" className="list-btn">List your business</Link>
            )}
          </div>

          {/* Mobile nav — icon-only */}
          <div className="nav-mobile">
            <button
              className="nav-icon-btn"
              aria-label="Search"
              onClick={() => searchInputRef.current?.focus()}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            <Link href={loggedIn ? "/account" : "/login"} className="nav-icon-btn" aria-label="Account">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </Link>
          </div>
        </header>

        {/* ── SEARCH HERO ── */}
        <div className="search-hero">
          <h1>Find Businesses in <em>Nagaland</em></h1>
          <p>Search across all 17 districts</p>

          <div className="search-box-wrap">
            <span className="search-icon-left">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            <input
              ref={searchInputRef}
              className="search-input"
              type="text"
              placeholder="Search by name, category…"
              value={query}
              onChange={(e) => handleInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && query.trim()) doSearch(query, selectedCity); }}
            />
            <button
              className="search-go-btn"
              onClick={() => { if (query.trim()) doSearch(query, selectedCity); }}
            >
              Search
            </button>
          </div>

          {detectedCity && !selectedCity && (
            <div className="city-detected-badge">
              📍 Results in <strong>{detectedCity}</strong>
              <button onClick={() => { setDetectedCity(null); doSearch(query.replace(new RegExp(detectedCity, 'gi'), '').trim(), ''); }} className="clear-city-btn">✕</button>
            </div>
          )}

          {!loading && query.trim() !== "" && results.length > 0 && (
            <div className="filter-chips-wrap">
              <button type="button" className={`filter-chip ${filterOpenNow ? "active" : ""}`} onClick={() => setFilterOpenNow(v => !v)}>Open Now</button>
              <button type="button" className={`filter-chip ${filterCity === "Kohima" ? "active" : ""}`} onClick={() => toggleFilterCity("Kohima")}>Kohima</button>
              <button type="button" className={`filter-chip ${filterCity === "Dimapur" ? "active" : ""}`} onClick={() => toggleFilterCity("Dimapur")}>Dimapur</button>
              <button type="button" className={`filter-chip ${filterBudget ? "active" : ""}`} onClick={() => setFilterBudget(v => !v)}>Budget</button>
              <button type="button" className={`filter-chip ${filterPremium ? "active" : ""}`} onClick={() => setFilterPremium(v => !v)}>Premium</button>
              <button type="button" className={`filter-chip ${filterVerified ? "active" : ""}`} onClick={() => setFilterVerified(v => !v)}>Verified</button>
            </div>
          )}
        </div>

        {/* ── CONTENT ── */}
        <div className="content">
          <div className="results-col">

            {/* Trending chips — shown when no active search */}
            {!loading && query.trim() === "" && (
              <div className="trending-section">
                {!hasSearched && (
                  <p className="trending-label">Trending</p>
                )}
                <div className="trending-chips">
                  {TRENDING_CHIPS.map((label) => (
                    <button key={label} type="button" className="chip-btn" onClick={() => { setQuery(label); doSearch(label, selectedCity); }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Zero results */}
            {hasSearched && !loading && query.trim() !== "" && results.length === 0 && (
              <div className="zero-results-ui">
                <p className="zero-results-heading">
                  {detectedPrice
                    ? `No listings under ₹${detectedPrice.toLocaleString('en-IN')} right now`
                    : `Nothing found for "${query}"`}
                </p>
                {relatedResults.length > 0 ? (
                  <>
                    <p className="zero-results-sub">You might also like:</p>
                    <div className="results-grid">{relatedResults.map(renderCard)}</div>
                  </>
                ) : (
                  <>
                    <p className="trending-label" style={{ marginTop: '1.25rem' }}>Try searching for:</p>
                    <div className="trending-chips">
                      {TRENDING_CHIPS.map((label) => (
                        <button key={label} type="button" className="chip-btn" onClick={() => { setQuery(label); doSearch(label, selectedCity); }}>{label}</button>
                      ))}
                    </div>
                    <p className="zero-register">
                      <Link href="/register" style={{ color: "#c0392b" }}>List your business</Link>
                      {activeCity && <> · Growing in <strong style={{ color: "#c0392b" }}>{activeCity}</strong></>}
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Results meta */}
            {hasSearched && !loading && results.length > 0 && (
              <>
                {correctedQuery && (
                  <div className="corrected-msg">Showing results for <strong>&ldquo;{correctedQuery}&rdquo;</strong></div>
                )}
                <div className="results-meta">
                  <strong>{hasActiveFilter ? filteredResults.length : results.length}</strong> result{(hasActiveFilter ? filteredResults.length : results.length) !== 1 ? "s" : ""}
                  {query && <> for &ldquo;{query}&rdquo;</>}
                  {activeCity && <> in {activeCity}</>}
                  {hasActiveFilter && <span className="filtered-hint"> (filtered)</span>}
                </div>
              </>
            )}

            {/* Loading skeletons */}
            {loading && (
              <>
                <div className="loading-hint">{query.trim() ? "Searching…" : "Loading…"}</div>
                <div className="results-grid">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div className="skeleton-card" key={i}>
                      <div className="skeleton skeleton-img" />
                      <div className="skeleton-body">
                        <div className="skeleton skeleton-line w40" />
                        <div className="skeleton skeleton-line w80" />
                        <div className="skeleton skeleton-line w60" />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Filter empty state */}
            {!loading && results.length > 0 && hasActiveFilter && filteredResults.length === 0 && (
              <p className="no-filter-match">No results match your filters. Try clearing a filter above.</p>
            )}

            {/* Results grid */}
            {!loading && results.length > 0 && (
              <div className="results-grid">
                {(hasActiveFilter ? filteredResults : results).map(renderCard)}
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{ background: "#0a0a0a", minHeight: "100vh" }} />}>
      <SearchPageInner />
    </Suspense>
  );
}

const styles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0a0a0a; color: #e0e0e0; font-family: 'Sora', sans-serif; min-height: 100vh; }
  .search-page { min-height: 100vh; background: #0a0a0a; display: flex; flex-direction: column; }

  /* ── NAVBAR ── */
  .search-header {
    background: rgba(10,10,10,0.96);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid #1a1a1a;
    padding: 0 1.5rem;
    height: 56px;
    display: flex;
    align-items: center;
    gap: 1rem;
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .logo-link { display: flex; align-items: center; gap: 8px; text-decoration: none; }
  .logo-text { display: flex; flex-direction: column; }
  .logo-yana { font-family: 'Playfair Display', serif; font-size: 1.3rem; font-weight: 700; color: #fff; line-height: 1; }
  .logo-sub { font-family: 'Sora', sans-serif; font-size: 0.5rem; letter-spacing: 0.35em; color: #666; text-transform: uppercase; margin-top: 2px; }

  .nav-desktop { display: flex; align-items: center; gap: 0.75rem; }
  .nav-mobile { display: none; align-items: center; gap: 0.5rem; }

  .list-btn {
    background: #c0392b; color: #fff; text-decoration: none;
    font-size: 0.85rem; font-weight: 600; padding: 10px 18px;
    border-radius: 6px; transition: background 0.2s;
    display: inline-flex; align-items: center;
  }
  .list-btn:hover { background: #e74c3c; }

  .nav-avatar {
    width: 36px; height: 36px; border-radius: 999px;
    background: rgba(255,255,255,0.04); border: 1px solid #2a2a2a;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; text-decoration: none; color: #aaa;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
    font-size: 0.9rem;
  }
  .nav-avatar:hover { background: #c0392b; border-color: #e74c3c; color: #fff; }
  .nav-avatar-placeholder { pointer-events: none; visibility: hidden; }

  .nav-icon-btn {
    width: 38px; height: 38px; border-radius: 999px;
    background: rgba(255,255,255,0.04); border: 1px solid #222;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: #aaa; transition: background 0.15s, color 0.15s, border-color 0.15s;
    text-decoration: none;
  }
  .nav-icon-btn:hover { background: rgba(192,57,43,0.15); border-color: rgba(192,57,43,0.4); color: #e74c3c; }

  /* ── SEARCH HERO ── */
  .search-hero {
    background: #0a0a0a;
    padding: 2.5rem 2rem 2rem;
    text-align: center;
    position: relative;
  }
  .search-hero::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse at 50% 0%, rgba(192,57,43,0.05) 0%, transparent 70%);
    pointer-events: none;
  }
  .search-hero h1 { font-family: 'Playfair Display', serif; font-size: clamp(1.5rem, 4vw, 2.2rem); color: #fff; margin-bottom: 0.25rem; position: relative; }
  .search-hero h1 em { font-style: normal; color: #c0392b; }
  .search-hero p { color: #555; margin-bottom: 1.25rem; font-size: 0.85rem; position: relative; }

  .search-box-wrap {
    max-width: 640px; margin: 0 auto;
    display: flex; align-items: center;
    border-radius: 10px; overflow: hidden;
    border: 1px solid #222; background: #111;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .search-box-wrap:focus-within { border-color: #333; box-shadow: 0 0 0 3px rgba(255,255,255,0.04); }
  .search-icon-left { padding: 0 0 0 14px; color: #555; display: flex; align-items: center; flex-shrink: 0; }
  .search-input {
    flex: 1; background: transparent; border: none; outline: none;
    padding: 13px 12px; color: #fff; font-family: 'Sora', sans-serif;
    font-size: 0.95rem; min-width: 0;
  }
  .search-input::placeholder { color: #444; }
  .search-go-btn {
    background: #c0392b; border: none; padding: 0 22px;
    color: #fff; font-family: 'Sora', sans-serif; font-size: 0.85rem;
    font-weight: 600; cursor: pointer; transition: background 0.2s;
    height: 100%; min-height: 48px; flex-shrink: 0;
  }
  .search-go-btn:hover { background: #e74c3c; }

  .city-detected-badge {
    margin-top: 0.75rem; display: inline-flex; align-items: center; gap: 0.4rem;
    background: rgba(192,57,43,0.08); border: 1px solid rgba(192,57,43,0.2);
    color: #c0392b; padding: 0.35rem 0.75rem; border-radius: 20px; font-size: 0.8rem;
  }
  .clear-city-btn { background: none; border: none; color: #666; cursor: pointer; font-size: 0.75rem; padding: 0 0.1rem; }
  .clear-city-btn:hover { color: #c0392b; }

  .filter-chips-wrap {
    display: flex; flex-wrap: wrap; gap: 0.4rem;
    justify-content: center; margin-top: 0.9rem; padding: 0 0.5rem;
  }
  .filter-chip {
    padding: 0.4rem 0.85rem; background: transparent;
    border: 1px solid #2a2a2a; color: #888;
    font-family: 'Sora', sans-serif; font-size: 0.8rem;
    border-radius: 999px; cursor: pointer;
    transition: background 0.2s, border-color 0.2s, color 0.2s;
  }
  .filter-chip:hover { border-color: #444; color: #ccc; }
  .filter-chip.active { background: #c0392b; border-color: #c0392b; color: #fff; }

  /* ── CONTENT ── */
  .content { flex: 1; padding: 1.5rem 2rem; max-width: 1100px; margin: 0 auto; width: 100%; }

  /* ── TRENDING ── */
  .trending-section { padding: 0.5rem 0 1rem; }
  .trending-label { font-size: 0.78rem; color: #555; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; margin-bottom: 0.6rem; }
  .trending-chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .chip-btn {
    background: rgba(255,255,255,0.04); border: 1px solid #222; color: #999;
    padding: 0.4rem 0.9rem; border-radius: 999px;
    font-family: 'Sora', sans-serif; font-size: 0.8rem;
    cursor: pointer; transition: background 0.2s, border-color 0.2s, color 0.2s;
    white-space: nowrap;
  }
  .chip-btn:hover { background: rgba(192,57,43,0.12); border-color: rgba(192,57,43,0.35); color: #e74c3c; }

  /* ── RESULTS META ── */
  .results-meta { font-size: 0.83rem; color: #666; margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 1px solid #1a1a1a; }
  .results-meta strong { color: #c0392b; }
  .filtered-hint { color: #555; font-weight: normal; }
  .corrected-msg { font-size: 0.83rem; color: #666; margin-bottom: 0.75rem; }
  .corrected-msg strong { color: #999; }
  .loading-hint { font-size: 0.83rem; color: #555; margin-bottom: 0.75rem; }
  .no-filter-match { color: #666; font-size: 0.85rem; margin-bottom: 1rem; }
  .zero-results-ui { padding: 1rem 0; }
  .zero-results-heading { font-size: 0.9rem; color: #888; margin-bottom: 0.4rem; }
  .zero-results-sub { font-size: 0.83rem; color: #555; margin-bottom: 1rem; }
  .zero-register { margin-top: 1rem; font-size: 0.83rem; color: #555; }

  /* ── RESULTS GRID ── */
  .results-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }

  /* ── BUSINESS CARD ── */
  .biz-card {
    background: #111; border: 1px solid #1e1e1e;
    border-radius: 10px; overflow: hidden;
    display: flex; flex-direction: column;
    transition: transform 0.18s, border-color 0.18s;
  }
  .biz-card-plus { border-color: rgba(192,57,43,0.25); }
  .biz-card:hover { transform: translateY(-2px); border-color: #2a2a2a; }
  .biz-card-plus:hover { border-color: rgba(192,57,43,0.45); }
  .biz-card-link { text-decoration: none; color: inherit; display: block; }

  .biz-photo-wrap { position: relative; width: 100%; }
  .biz-photo { width: 100%; height: 150px; object-fit: cover; display: block; }
  .biz-photo-placeholder {
    width: 100%; height: 130px;
    background: linear-gradient(160deg, #161616 0%, #0d0d0d 100%);
    display: flex; align-items: center; justify-content: center;
  }
  .biz-placeholder-emoji { font-size: 2.2rem; opacity: 0.35; }

  .biz-body { padding: 12px 14px 8px; }
  .biz-top-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px; gap: 8px; }
  .biz-category {
    font-size: 0.68rem; color: #c0392b;
    text-transform: uppercase; letter-spacing: 0.07em; font-weight: 700;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .biz-verified-badge {
    flex-shrink: 0; padding: 2px 8px; border-radius: 999px;
    background: rgba(212,175,55,0.1); color: #d4af37;
    border: 1px solid rgba(212,175,55,0.25);
    font-size: 0.65rem; font-weight: 700; white-space: nowrap;
  }
  .biz-name { font-family: 'Playfair Display', serif; font-size: 1rem; color: #f0f0f0; margin-bottom: 3px; line-height: 1.3; }
  .biz-city { font-size: 0.75rem; color: #555; margin-bottom: 5px; }
  .biz-desc {
    font-size: 0.78rem; color: #444; line-height: 1.5;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }

  .biz-actions { display: flex; gap: 7px; padding: 0 14px 12px; margin-top: auto; }
  .action-btn {
    flex: 1; display: inline-flex; align-items: center; justify-content: center;
    gap: 5px; padding: 8px 10px; border-radius: 6px; font-size: 0.75rem;
    font-weight: 600; font-family: 'Sora', sans-serif; text-decoration: none;
    cursor: pointer; transition: opacity 0.2s; border: none;
  }
  .action-btn:hover { opacity: 0.85; }
  .whatsapp-btn { background: #25d366; color: #fff; }
  .call-btn { background: #1e1e1e; color: #ccc; border: 1px solid #2a2a2a; }
  .save-btn { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.6); border: 1px solid #222; }
  .save-btn.saved { background: rgba(192,57,43,0.12); color: #e05c4e; border-color: rgba(192,57,43,0.35); }
  .save-btn:hover { opacity: 1 !important; background: rgba(192,57,43,0.1); border-color: rgba(192,57,43,0.4); color: #e05c4e; }

  /* ── SKELETONS ── */
  @keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
  .skeleton { background: linear-gradient(90deg, #181818 25%, #202020 50%, #181818 75%); background-size: 800px 100%; animation: shimmer 1.5s infinite; border-radius: 6px; }
  .skeleton-card { background: #111; border: 1px solid #1a1a1a; border-radius: 10px; overflow: hidden; }
  .skeleton-img { height: 130px; width: 100%; border-radius: 0; }
  .skeleton-body { padding: 0.9rem; display: flex; flex-direction: column; gap: 0.5rem; }
  .skeleton-line { height: 11px; }
  .skeleton-line.w40 { width: 40%; }
  .skeleton-line.w80 { width: 80%; }
  .skeleton-line.w60 { width: 60%; }

  /* ── MOBILE ── */
  @media (max-width: 700px) {
    .search-header { padding: 0 1rem; height: 52px; }
    .nav-desktop { display: none; }
    .nav-mobile { display: flex; }

    .search-hero { padding: 1.5rem 1rem 1.25rem; }
    .search-hero h1 { font-size: 1.35rem; }
    .search-hero p { margin-bottom: 1rem; }

    .search-box-wrap { border-radius: 8px; }
    .search-input { font-size: 0.9rem; padding: 12px 10px; }
    .search-go-btn { padding: 0 16px; font-size: 0.82rem; min-height: 44px; }

    .filter-chips-wrap {
      flex-wrap: nowrap; overflow-x: auto; justify-content: flex-start;
      -webkit-overflow-scrolling: touch; scrollbar-width: none; padding-bottom: 2px;
    }
    .filter-chips-wrap::-webkit-scrollbar { display: none; }
    .filter-chip { flex-shrink: 0; }

    .content { padding: 1rem; }

    .trending-chips {
      flex-wrap: nowrap; overflow-x: auto; justify-content: flex-start;
      -webkit-overflow-scrolling: touch; scrollbar-width: none;
    }
    .trending-chips::-webkit-scrollbar { display: none; }
    .chip-btn { flex-shrink: 0; }

    .results-grid { grid-template-columns: 1fr; gap: 0.75rem; }

    /* Mobile card — horizontal-ish, no tall image */
    .biz-card { flex-direction: row; align-items: stretch; border-radius: 10px; }
    .biz-card-link { display: flex; flex: 1; min-width: 0; }

    .biz-photo-wrap { width: 90px; flex-shrink: 0; }
    .biz-photo { width: 90px; height: 100%; object-fit: cover; display: block; }
    .biz-photo-placeholder { width: 90px; height: 100%; min-height: 90px; }
    .biz-placeholder-emoji { font-size: 1.6rem; }

    .biz-body { padding: 10px 10px 8px; flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; }
    .biz-name { font-size: 0.92rem; }
    .biz-city { font-size: 0.72rem; }
    .biz-desc { font-size: 0.73rem; -webkit-line-clamp: 1; }

    .biz-actions { padding: 0 10px 10px 100px; gap: 6px; }
    .action-btn { font-size: 0.72rem; padding: 7px 8px; gap: 4px; }
  }
`;

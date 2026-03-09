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
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiReasons, setAiReasons] = useState<Record<string, string>>({});
  const [detectedCity, setDetectedCity] = useState<string | null>(null);
  const [correctedQuery, setCorrectedQuery] = useState<string | null>(null);
  const [baseResults, setBaseResults] = useState<Business[]>([]);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [occasions, setOccasions] = useState<string[]>([]);
  const [occasionsLoading, setOccasionsLoading] = useState(false);
  const [occasion, setOccasion] = useState("");
  const [area, setArea] = useState("");
  const [budget, setBudget] = useState("");
  const [aiPickLoading, setAiPickLoading] = useState(false);
  const [aiPickedActive, setAiPickedActive] = useState(false);
  const [aiPickedReasons, setAiPickedReasons] = useState<Record<string, string>>({});
  const [filterOpenNow, setFilterOpenNow] = useState(false);
  const [filterCity, setFilterCity] = useState<"" | "Kohima" | "Dimapur">("");
  const [filterBudget, setFilterBudget] = useState(false);
  const [filterPremium, setFilterPremium] = useState(false);
  const [filterVerified, setFilterVerified] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  const DID_YOU_MEAN = ["Cafés", "Restaurants", "Gyms", "PG & Hostels", "Turfs & Sports", "Study Spaces"];
  const POPULAR_SEARCHES = ["Cafes", "PG rooms", "Gyms", "Turfs", "Hotels"];
  const TRENDING_CHIPS = ["Cafes Kohima", "PG rooms", "Gyms", "Turfs", "Hotels Dimapur", "Study space"];

  const searchParams = useSearchParams();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const q = searchParams.get("q") || "";
    if (q) {
      setQuery(q);
      doSearch(q, "", "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let isMounted = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return;
        setLoggedIn(!!data.session);
      })
      .catch(() => {
        if (!isMounted) return;
        setLoggedIn(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  async function doSearch(q: string, city?: string) {
    setLoading(true);
    setHasSearched(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q);
      if (city) params.set("city", city);
      const res = await fetch(`/api/search?${params}`);
      const json = await res.json();
      setDetectedCity(json.detectedCity || null);
      const biz = json.businesses ?? [];
      setResults(biz);
      setBaseResults(biz);
      setAiSummary(json.aiSummary || null);
      setAiReasons(json.aiReasons || {});
      setCorrectedQuery(json.correctedQuery ?? null);
      setAiPickedActive(false);
      setFilterOpenNow(false);
      setFilterCity("");
      setFilterBudget(false);
      setFilterPremium(false);
      setFilterVerified(false);
    } finally {
      setLoading(false);
    }
  }

  async function openAiPanel() {
    setAiPanelOpen(true);
    setOccasion("");
    setArea("");
    setBudget("");
    setOccasions([]);
    setOccasionsLoading(true);
    try {
      const res = await fetch(`/api/search/occasions?q=${encodeURIComponent(query)}`);
      const json = await res.json();
      const list = Array.isArray(json.occasions) ? json.occasions : [];
      setOccasions(list.length > 0 ? list : ["General", "Hangout", "Other"]);
    } finally {
      setOccasionsLoading(false);
    }
  }

  async function submitAiPick() {
    if (!occasion.trim() || !budget) return;
    setAiPickLoading(true);
    try {
      const res = await fetch("/api/search/ai-pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          occasion: occasion.trim(),
          area: activeCity || area.trim(),
          budget,
          businesses: baseResults.map((b) => ({
            id: b.id,
            name: b.name,
            category: b.category,
            city: b.city,
            description: b.description,
          })),
        }),
      });
      const json = await res.json();
      const ranked = json.ranked || [];
      const reasonMap: Record<string, string> = {};
      ranked.forEach((r: { id: string; reason: string }) => {
        if (r.id && r.reason) reasonMap[r.id] = r.reason;
      });
      const orderIds = ranked.map((r: { id: string }) => r.id);
      const reordered = orderIds
        .map((id) => baseResults.find((b) => b.id === id))
        .filter(Boolean) as Business[];
      const rest = baseResults.filter((b) => !orderIds.includes(b.id));
      setResults([...reordered, ...rest]);
      setAiPickedReasons(reasonMap);
      setAiPickedActive(true);
      setAiPanelOpen(false);
    } finally {
      setAiPickLoading(false);
    }
  }

  const displayReasons = aiPickedActive ? aiPickedReasons : aiReasons;
  const budgetOptions = ["Affordable", "Mid-range", "Premium", "Any"];

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

  return (
    <>
      <style>{styles}</style>
      <div className="search-page">
        <header className="search-header">
          <Link href="/" className="logo-link">
            <svg width="34" height="40" viewBox="0 0 120 140" fill="none"><defs><linearGradient id="pinG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#8B0000"/><stop offset="50%" stopColor="#c0392b"/><stop offset="100%" stopColor="#922B21"/></linearGradient><linearGradient id="feathG" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#8B0000"/><stop offset="60%" stopColor="#c0392b"/><stop offset="100%" stopColor="#1a1a1a"/></linearGradient><radialGradient id="glassG" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#1a1a1a"/><stop offset="100%" stopColor="#0d0d0d"/></radialGradient></defs><g transform="rotate(-35, 45, 30)"><path d="M20 55 C10 40 15 15 40 0 C50 10 55 30 40 45 Z" fill="url(#feathG)"/><circle cx="20" cy="55" r="3" fill="#D4A017"/><circle cx="20" cy="55" r="1.5" fill="#8B0000"/></g><path d="M60 18 C38 18 20 36 20 58 C20 82 60 120 60 120 C60 120 100 82 100 58 C100 36 82 18 60 18Z" fill="url(#pinG)"/><path d="M42 35 L60 48 L78 35" stroke="rgba(0,0,0,0.3)" strokeWidth="2" fill="none"/><path d="M50 72 L60 62 L70 72 L60 82 Z" stroke="rgba(212,160,23,0.5)" strokeWidth="1" fill="rgba(0,0,0,0.15)"/><path d="M47 88 L60 96 L73 88" stroke="rgba(212,160,23,0.3)" strokeWidth="1" fill="none"/><circle cx="60" cy="58" r="19" fill="url(#glassG)" stroke="white" strokeWidth="2.5"/><path d="M54 52 L68 66" stroke="white" strokeWidth="2.5" strokeLinecap="round"/><path d="M54 52 L54 60 L62 52 Z" fill="white"/><line x1="74" y1="72" x2="84" y2="82" stroke="white" strokeWidth="4" strokeLinecap="round"/></svg>
            <div className="logo-text">
              <span className="logo-yana">Yana</span>
              <span className="logo-sub">NAGALAND</span>
            </div>
          </Link>
          <div style={{ flex: 1 }} />
          {!mounted ? (
            <span className="list-avatar list-avatar-placeholder" aria-hidden />
          ) : loggedIn ? (
            <>
              <Link href="/dashboard" className="list-btn">Dashboard</Link>
              <Link href="/dashboard" className="list-avatar" aria-label="Open dashboard">
                <span className="list-avatar-icon">👤</span>
              </Link>
            </>
          ) : (
            <Link href="/register" className="list-btn">List your business</Link>
          )}
        </header>

        <div className="search-hero">
          <h1>Find Businesses in <em>Nagaland</em></h1>
          <p>Search across all 17 districts</p>
          <div className="search-box-wrap">
            <input
              className="search-input"
              type="text"
              placeholder="Search by name, category, or keyword…"
              value={query}
              onChange={(e) => handleInput(e.target.value)}
              autoFocus
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
              📍 Showing results in <strong>{detectedCity}</strong>
              <button onClick={() => { setDetectedCity(null); doSearch(query.replace(new RegExp(detectedCity, 'gi'), '').trim(), ''); }} className="clear-city-btn">✕ Show all</button>
            </div>
          )}
          {!loading && query.trim() !== "" && results.length > 0 && (
            <div className="filter-chips-wrap">
              <button type="button" className={`filter-chip ${filterOpenNow ? "active" : ""}`} onClick={() => setFilterOpenNow((v) => !v)}>Open Now</button>
              <button type="button" className={`filter-chip ${filterCity === "Kohima" ? "active" : ""}`} onClick={() => toggleFilterCity("Kohima")}>Kohima</button>
              <button type="button" className={`filter-chip ${filterCity === "Dimapur" ? "active" : ""}`} onClick={() => toggleFilterCity("Dimapur")}>Dimapur</button>
              <button type="button" className={`filter-chip ${filterBudget ? "active" : ""}`} onClick={() => setFilterBudget((v) => !v)}>Budget</button>
              <button type="button" className={`filter-chip ${filterPremium ? "active" : ""}`} onClick={() => setFilterPremium((v) => !v)}>Premium</button>
              <button type="button" className={`filter-chip ${filterVerified ? "active" : ""}`} onClick={() => setFilterVerified((v) => !v)}>Verified</button>
            </div>
          )}
        </div>

        <div className="content">
          <div className="results-col">
            {!loading && query.trim() === "" && (
              <div className="state-msg trending-section">
                {!hasSearched && (
                  <>
                    <h2>Start your search above</h2>
                    <p>Type a name, or pick a trending search below.</p>
                  </>
                )}
                <p className="trending-label">Trending:</p>
                <div className="popular-chips trending-chips">
                  {TRENDING_CHIPS.map((label) => (
                    <button
                      key={label}
                      type="button"
                      className="chip-btn"
                      onClick={() => { setQuery(label); doSearch(label, selectedCity); }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {hasSearched && !loading && query.trim() !== "" && results.length === 0 && (
              <div className="state-msg sad zero-results-ui">
                <h2>No results for &ldquo;{query || "your search"}&rdquo;</h2>
                <p className="did-you-mean-label">Did you mean:</p>
                <div className="popular-chips">
                  {DID_YOU_MEAN.slice(0, 3).map((label) => (
                    <button
                      key={label}
                      type="button"
                      className="chip-btn"
                      onClick={() => { setQuery(label); doSearch(label, selectedCity); }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="popular-label">Popular searches:</p>
                <div className="popular-chips">
                  {POPULAR_SEARCHES.map((label) => (
                    <button
                      key={label}
                      type="button"
                      className="chip-btn"
                      onClick={() => { setQuery(label); doSearch(label, selectedCity); }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="zero-register">
                  <Link href="/register" style={{ color: "#c0392b" }}>List your business</Link>
                  {activeCity && <> · Growing in <strong style={{ color: "#c0392b" }}>{activeCity}</strong></>}
                </p>
              </div>
            )}
            {hasSearched && !loading && query.trim() !== "" && results.length > 0 && (
              <>
                {correctedQuery && (
                  <div className="corrected-msg">
                    Showing results for <strong>&ldquo;{correctedQuery}&rdquo;</strong>
                  </div>
                )}
                {(aiPickedActive || aiSummary || Object.keys(aiReasons).length > 0) && (
                  <span className="ai-matched-badge">
                    {aiPickedActive ? "✨ AI picked for you" : "✨ AI matched"}
                  </span>
                )}
                {aiSummary && (
                  <div className="ai-summary-box">
                    <div className="ai-summary-label">Yana AI</div>
                    <p>{aiSummary}</p>
                  </div>
                )}
                <div className="results-meta">
                  <strong>{hasActiveFilter ? filteredResults.length : results.length}</strong> result{(hasActiveFilter ? filteredResults.length : results.length) !== 1 ? "s" : ""}
                  {query && <> for &ldquo;{query}&rdquo;</>}
                  {activeCity && <> in {activeCity}</>}
                  {hasActiveFilter && <span className="filtered-hint"> (filtered)</span>}
                </div>
                {!aiPanelOpen && (
                  <button type="button" className="ask-ai-btn" onClick={openAiPanel}>
                    ✨ Ask AI to help you choose
                  </button>
                )}
                {aiPanelOpen && (
                  <div className="ai-panel">
                    <h3 className="ai-panel-title">Help AI pick for you</h3>
                    <div className="ai-panel-q">
                      <label>What&apos;s the occasion?</label>
                      {occasionsLoading ? (
                        <p className="ai-panel-loading">Loading options…</p>
                      ) : (
                        <div className="ai-panel-options">
                          {occasions.map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              className={occasion === opt ? "ai-opt-btn active" : "ai-opt-btn"}
                              onClick={() => setOccasion(opt)}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {!activeCity && (
                      <div className="ai-panel-q">
                        <label>Which area?</label>
                        <input
                          type="text"
                          className="ai-panel-input"
                          placeholder="e.g. Kohima, Dimapur, or leave blank"
                          value={area}
                          onChange={(e) => setArea(e.target.value)}
                        />
                      </div>
                    )}
                    <div className="ai-panel-q">
                      <label>Budget?</label>
                      <div className="ai-panel-options">
                        {budgetOptions.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            className={budget === opt ? "ai-opt-btn active" : "ai-opt-btn"}
                            onClick={() => setBudget(opt)}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="ai-panel-actions">
                      <button type="button" className="ai-panel-cancel" onClick={() => setAiPanelOpen(false)}>
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="ai-panel-submit"
                        disabled={!occasion || !budget || aiPickLoading}
                        onClick={submitAiPick}
                      >
                        {aiPickLoading ? "Picking…" : "Get my picks"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
            {loading && (
              <>
                <div className="loading-ai-hint">
                  {query.trim() ? "Finding results and ranking with AI…" : "Loading…"}
                </div>
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
            {!loading && results.length > 0 && hasActiveFilter && filteredResults.length === 0 && (
              <p className="no-filter-match">No results match your filters. Try clearing a filter above.</p>
            )}
            {!loading && results.length > 0 && (
              <div className="results-grid">
                {(hasActiveFilter ? filteredResults : results).map((biz) => {
                  const isPlus = (biz.plan || "").toLowerCase() === "plus";
                  return (
                  <div key={biz.id} className={`biz-card${isPlus ? " biz-card-plus" : ""}`}>
                    <Link href={`/business/${biz.id}`} className="biz-card-link">
                      <div className="biz-photo-wrap">
                        {getBizPhotoUrl(biz) ? (
                          <img src={getBizPhotoUrl(biz)!} alt={biz.name} className="biz-photo" />
                        ) : (
                          <div className="biz-photo-placeholder biz-photo-category">
                            <span>{biz.category}</span>
                          </div>
                        )}
                        {isPlus && (
                          <span className="biz-verified-badge">✓ Verified Business</span>
                        )}
                      </div>
                      <div className="biz-body">
                        <div className="biz-category">{isPlus && "⭐ "}{biz.category}</div>
                        <div className="biz-name">{biz.name}</div>
                        <div className="biz-city">📍 {biz.city}</div>
                        {(biz.is_verified || (biz as Business & { verified?: boolean }).verified) && <span className="biz-verified">✓ Verified</span>}
                        {displayReasons[biz.id] && (
                          <div className="biz-ai-matched">
                            <span className="ai-matched-label">{aiPickedActive ? "✨ AI picked for you" : "✨ AI matched"}</span>
                            <span className="ai-reason-text">{displayReasons[biz.id]}</span>
                          </div>
                        )}
                        <div className="biz-desc">{getBizDescription(biz)}</div>
                      </div>
                    </Link>
                    <div className="biz-actions">
                      {getWhatsAppUrl(biz) && (
                        <a href={getWhatsAppUrl(biz)!} target="_blank" rel="noopener noreferrer" className="action-btn whatsapp-btn">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          WhatsApp
                        </a>
                      )}
                      {getCallUrl(biz) && (
                        <a href={getCallUrl(biz)!} className="action-btn call-btn">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                          Call
                        </a>
                      )}
                    </div>
                  </div>
                );
                })}
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

  .search-header {
    background: rgba(10, 10, 10, 0.95);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid #1e1e1e;
    padding: 0 2rem;
    height: 64px;
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }
  .logo-link {
    display: flex;
    align-items: center;
    gap: 8px;
    text-decoration: none;
    line-height: 1;
  }
  .logo-text {
    display: flex;
    flex-direction: column;
  }
  .logo-yana {
    font-family: 'Playfair Display', serif;
    font-size: 1.4rem;
    font-weight: 700;
    color: #fff;
  }
  .logo-sub {
    font-family: 'Sora', sans-serif;
    font-size: 0.55rem;
    letter-spacing: 0.35em;
    color: #888;
    text-transform: uppercase;
    margin-top: 1px;
  }
  .list-btn {
    background: #c0392b;
    color: #fff;
    text-decoration: none;
    font-size: 0.82rem;
    font-weight: 600;
    padding: 8px 20px;
    border-radius: 6px;
    transition: background 0.2s;
  }
  .list-btn:hover { background: #e74c3c; }
  .list-avatar{
    width:32px;
    height:32px;
    border-radius:999px;
    background:rgba(255,255,255,0.04);
    border:1px solid #333;
    display:flex;
    align-items:center;
    justify-content:center;
    cursor:pointer;
    text-decoration:none;
    color:#aaa;
    transition:background 0.15s,border-color 0.15s,color 0.15s,transform 0.1s;
  }
  .list-avatar:hover{
    background:#c0392b;
    border-color:#e74c3c;
    color:#fff;
    transform:translateY(-1px);
  }
  .list-avatar-icon{font-size:0.9rem;}
  .list-avatar-placeholder{pointer-events:none;visibility:hidden;}

  .search-hero {
    background: #0a0a0a;
    padding: 3rem 2rem 2rem;
    text-align: center;
    position: relative;
  }
  .search-hero::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at 50% 0%, rgba(192, 57, 43, 0.05) 0%, transparent 70%);
    pointer-events: none;
  }
  .search-hero h1 {
    font-family: 'Playfair Display', serif;
    font-size: clamp(1.6rem, 4vw, 2.4rem);
    color: #fff;
    margin-bottom: 0.3rem;
    position: relative;
  }
  .search-hero h1 em { font-style: normal; color: #c0392b; }
  .search-hero p { color: #666; margin-bottom: 1.5rem; font-size: 0.9rem; position: relative; }

  .search-box-wrap {
    max-width: 660px;
    margin: 0 auto;
    display: flex;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #2a2a2a;
    background: #141414;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .search-box-wrap:focus-within {
    border-color: #c0392b;
    box-shadow: 0 0 0 3px rgba(192, 57, 43, 0.12);
  }
  .search-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    padding: 14px 20px;
    color: #fff;
    font-family: 'Sora', sans-serif;
    font-size: 0.95rem;
    min-width: 0;
  }
  .search-input::placeholder { color: #555; }
  .search-go-btn {
    background: #c0392b;
    border: none;
    padding: 0 28px;
    color: #fff;
    font-family: 'Sora', sans-serif;
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }
  .search-go-btn:hover { background: #e74c3c; }

  .filters {
    max-width: 660px;
    margin: 1rem auto 0;
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    justify-content: center;
  }
  .filter-select {
    padding: 0.5rem 1rem;
    background: #141414;
    border: 1px solid #2a2a2a;
    border-radius: 8px;
    color: #e0e0e0;
    font-family: 'Sora', sans-serif;
    font-size: 0.85rem;
    cursor: pointer;
    outline: none;
    flex: 1;
    min-width: 140px;
  }
  .filter-select option { background: #141414; }

  .city-detected-badge {
    margin-top: 0.75rem;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(192, 57, 43, 0.1);
    border: 1px solid rgba(192, 57, 43, 0.25);
    color: #c0392b;
    padding: 0.4rem 0.85rem;
    border-radius: 20px;
    font-size: 0.82rem;
  }
  .clear-city-btn {
    background: none;
    border: none;
    color: #888;
    cursor: pointer;
    font-size: 0.78rem;
    padding: 0 0.2rem;
  }
  .clear-city-btn:hover { color: #c0392b; }

  .filter-chips-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
    margin-top: 1rem;
    padding: 0 0.5rem;
  }
  .filter-chip {
    padding: 0.5rem 1rem;
    background: transparent;
    border: 1px solid #333;
    color: #999;
    font-family: 'Sora', sans-serif;
    font-size: 0.85rem;
    border-radius: 999px;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s, color 0.2s;
  }
  .filter-chip:hover {
    border-color: #555;
    color: #ccc;
    background: rgba(255,255,255,0.03);
  }
  .filter-chip.active {
    background: #c0392b;
    border-color: #c0392b;
    color: #fff;
  }
  .filter-chip.active:hover {
    background: #e74c3c;
    border-color: #e74c3c;
  }

  .content {
    flex: 1;
    padding: 2rem;
    max-width: 1100px;
    margin: 0 auto;
    width: 100%;
  }

  .results-meta {
    font-size: 0.88rem;
    color: #888;
    margin-bottom: 1.25rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid #1e1e1e;
  }
  .results-meta strong { color: #c0392b; }

  .ai-summary-box {
    background: rgba(192, 57, 43, 0.06);
    border: 1px solid rgba(192, 57, 43, 0.2);
    border-radius: 10px;
    padding: 1rem 1.25rem;
    margin-bottom: 1.25rem;
  }
  .ai-summary-label {
    font-size: 0.7rem;
    font-weight: 700;
    color: #c0392b;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 0.35rem;
  }
  .ai-summary-box p {
    font-size: 0.88rem;
    color: #ccc;
    line-height: 1.6;
    margin: 0;
  }

  .biz-ai-matched {
    margin-top: 6px;
    padding: 6px 8px;
    background: rgba(192, 57, 43, 0.08);
    border-radius: 6px;
    border-left: 3px solid rgba(192, 57, 43, 0.4);
  }
  .ai-matched-label {
    display: block;
    font-size: 0.7rem;
    font-weight: 600;
    color: #c0392b;
    margin-bottom: 2px;
  }
  .ai-reason-text {
    font-size: 0.78rem;
    color: #aaa;
    line-height: 1.4;
  }
  .ai-reason {
    margin-top: 6px;
    font-size: 0.75rem;
    color: #888;
    line-height: 1.4;
  }
  .ai-reason-tag {
    display: inline-block;
    background: rgba(192, 57, 43, 0.15);
    color: #c0392b;
    font-size: 0.6rem;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 3px;
    letter-spacing: 0.05em;
    vertical-align: middle;
    margin-right: 3px;
  }

  .state-msg { text-align: center; padding: 4rem 2rem; }
  .state-msg h2 { font-family: 'Playfair Display', serif; font-size: 1.5rem; color: #fff; margin-bottom: 0.5rem; }
  .state-msg p { color: #888; font-size: 0.9rem; line-height: 1.6; }
  .state-msg.sad h2 { color: #e74c3c; }
  .zero-results-ui .did-you-mean-label,
  .zero-results-ui .popular-label { margin-top: 1rem; margin-bottom: 0.4rem; font-size: 0.88rem; color: #888; }
  .zero-results-ui .popular-label { margin-top: 1.25rem; }
  .zero-register { margin-top: 1rem; font-size: 0.85rem; }
  .trending-section .trending-label { margin-top: 1rem; margin-bottom: 0.4rem; font-size: 0.88rem; color: #888; }
  .trending-chips { margin-top: 0.5rem; }
  .results-meta .filtered-hint { color: #888; font-weight: normal; }
  .no-filter-match { color: #888; font-size: 0.9rem; margin-bottom: 1rem; }

  .popular-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
    margin-top: 1.25rem;
  }
  .chip-btn {
    background: rgba(255,255,255,0.06);
    border: 1px solid #333;
    color: #ccc;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-family: 'Sora', sans-serif;
    font-size: 0.85rem;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s, color 0.2s;
  }
  .chip-btn:hover {
    background: rgba(192, 57, 43, 0.15);
    border-color: rgba(192, 57, 43, 0.4);
    color: #e74c3c;
  }

  .corrected-msg {
    font-size: 0.85rem;
    color: #888;
    margin-bottom: 1rem;
    padding: 0.5rem 0;
  }
  .corrected-msg strong { color: #aaa; }

  .ai-matched-badge {
    display: inline-block;
    font-size: 0.8rem;
    color: #c0392b;
    margin-bottom: 0.75rem;
    padding: 0.25rem 0.5rem;
    background: rgba(192, 57, 43, 0.1);
    border-radius: 6px;
    font-weight: 600;
  }

  .loading-ai-hint {
    font-size: 0.85rem;
    color: #666;
    margin-bottom: 0.75rem;
  }

  .ask-ai-btn {
    display: inline-block;
    margin-bottom: 1.25rem;
    padding: 0.5rem 1rem;
    background: rgba(192, 57, 43, 0.12);
    border: 1px solid rgba(192, 57, 43, 0.35);
    color: #e74c3c;
    font-size: 0.88rem;
    font-weight: 600;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s;
  }
  .ask-ai-btn:hover {
    background: rgba(192, 57, 43, 0.2);
    border-color: rgba(192, 57, 43, 0.5);
  }

  .ai-panel {
    background: #141414;
    border: 1px solid #2a2a2a;
    border-radius: 12px;
    padding: 1.25rem 1.5rem;
    margin-bottom: 1.5rem;
  }
  .ai-panel-title {
    font-size: 1rem;
    font-weight: 600;
    color: #fff;
    margin-bottom: 1rem;
  }
  .ai-panel-q {
    margin-bottom: 1rem;
  }
  .ai-panel-q label {
    display: block;
    font-size: 0.8rem;
    color: #888;
    margin-bottom: 0.4rem;
  }
  .ai-panel-options {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .ai-opt-btn {
    padding: 0.4rem 0.75rem;
    background: #1a1a1a;
    border: 1px solid #333;
    color: #ccc;
    font-size: 0.82rem;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s, color 0.2s;
  }
  .ai-opt-btn:hover {
    background: #222;
    border-color: #444;
    color: #fff;
  }
  .ai-opt-btn.active {
    background: rgba(192, 57, 43, 0.2);
    border-color: #c0392b;
    color: #e74c3c;
  }
  .ai-panel-input {
    width: 100%;
    max-width: 280px;
    padding: 0.5rem 0.75rem;
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 6px;
    color: #fff;
    font-size: 0.88rem;
  }
  .ai-panel-input::placeholder { color: #555; }
  .ai-panel-loading {
    font-size: 0.85rem;
    color: #666;
    margin: 0.25rem 0 0;
  }
  .ai-panel-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 1.25rem;
  }
  .ai-panel-cancel {
    padding: 0.5rem 1rem;
    background: transparent;
    border: 1px solid #444;
    color: #888;
    font-size: 0.85rem;
    border-radius: 6px;
    cursor: pointer;
  }
  .ai-panel-cancel:hover { color: #ccc; border-color: #555; }
  .ai-panel-submit {
    padding: 0.5rem 1.25rem;
    background: #c0392b;
    border: none;
    color: #fff;
    font-size: 0.85rem;
    font-weight: 600;
    border-radius: 6px;
    cursor: pointer;
  }
  .ai-panel-submit:hover:not(:disabled) { background: #e74c3c; }
  .ai-panel-submit:disabled { opacity: 0.5; cursor: not-allowed; }

  .results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.25rem;
  }

  .biz-card {
    background: #141414;
    border: 1px solid #1e1e1e;
    border-radius: 10px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    transition: transform 0.2s, border-color 0.2s;
  }
  .biz-card-plus {
    border: 1px solid rgba(192, 57, 43, 0.3);
  }
  .biz-card:hover {
    transform: translateY(-3px);
    border-color: #333;
  }
  .biz-card-plus:hover {
    border-color: rgba(192, 57, 43, 0.5);
  }
  .biz-card-link {
    text-decoration: none;
    color: inherit;
    display: block;
  }
  .biz-photo-wrap {
    position: relative;
    width: 100%;
  }
  .biz-verified-badge {
    position: absolute;
    bottom: 8px;
    left: 8px;
    padding: 4px 10px;
    border-radius: 999px;
    background: white;
    color: #b8860b;
    border: 1.5px solid #d4af37;
    box-shadow: 0 2px 8px rgba(212, 175, 55, 0.3);
    font-family: 'Sora', sans-serif;
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;
  }
  .biz-photo { width: 100%; height: 150px; object-fit: cover; display: block; }
  .biz-photo-placeholder {
    width: 100%;
    height: 150px;
    background: linear-gradient(135deg, #1a1a1a, #0a0a0a);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
    color: #333;
  }
  .biz-photo-placeholder.biz-photo-category {
    font-size: 0.9rem;
    color: #666;
    font-family: 'Sora', sans-serif;
    text-align: center;
    padding: 0.5rem;
    background: linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%);
  }
  .biz-photo-placeholder.biz-photo-category span {
    display: block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .biz-body { padding: 14px 16px 10px; }
  .biz-category {
    font-size: 0.7rem;
    color: #c0392b;
    letter-spacing: 0.08em;
    text-transform: uppercase;
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
  .biz-city { font-size: 0.78rem; color: #666; margin-bottom: 6px; }
  .biz-verified {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.7rem;
    color: #27ae60;
    font-weight: 500;
    margin-bottom: 4px;
  }
  .biz-desc {
    font-size: 0.8rem;
    color: #555;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .biz-actions {
    display: flex;
    gap: 8px;
    padding: 0 16px 14px;
    margin-top: auto;
  }
  .action-btn {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 0.78rem;
    font-weight: 600;
    font-family: 'Sora', sans-serif;
    text-decoration: none;
    transition: opacity 0.2s;
    cursor: pointer;
  }
  .action-btn:hover { opacity: 0.85; }
  .whatsapp-btn {
    background: #25d366;
    color: #fff;
  }
  .call-btn {
    background: #2a2a2a;
    color: #fff;
    border: 1px solid #333;
  }

  @keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
  .skeleton { background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%); background-size: 800px 100%; animation: shimmer 1.5s infinite; border-radius: 8px; }
  .skeleton-card { background: #141414; border: 1px solid #1e1e1e; border-radius: 10px; overflow: hidden; }
  .skeleton-img { height: 150px; width: 100%; border-radius: 0; }
  .skeleton-body { padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
  .skeleton-line { height: 12px; }
  .skeleton-line.w40 { width: 40%; }
  .skeleton-line.w80 { width: 80%; }
  .skeleton-line.w60 { width: 60%; }

  @media (max-width: 700px) {
    .content { padding: 1rem; }
    .search-hero { padding: 2rem 1rem 1.5rem; }
    .results-grid { grid-template-columns: 1fr; }
  }
`;

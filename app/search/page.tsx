"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function NagaWarrior({ state }: { state: "idle" | "searching" | "sad" | "happy" }) {
  return (
    <div className={`warrior-wrap warrior-${state}`} aria-hidden="true">
      <svg viewBox="0 0 120 200" xmlns="http://www.w3.org/2000/svg" className="warrior-svg" fill="none">
        <line x1="95" y1="20" x2="75" y2="140" stroke="#c9963a" strokeWidth="3" strokeLinecap="round" />
        <polygon points="95,20 88,38 102,38" fill="#c9963a" />
        <ellipse cx="42" cy="28" rx="5" ry="18" fill="#8B1A1A" transform="rotate(-20 42 28)" />
        <ellipse cx="55" cy="22" rx="5" ry="20" fill="#c9963a" transform="rotate(-5 55 22)" />
        <ellipse cx="68" cy="26" rx="5" ry="18" fill="#8B1A1A" transform="rotate(15 68 26)" />
        <rect x="36" y="42" width="42" height="10" rx="3" fill="#c9963a" />
        <rect x="36" y="42" width="42" height="5" rx="3" fill="#a07020" opacity="0.5" />
        <ellipse cx="57" cy="70" rx="22" ry="24" fill="#c8956b" />
        <ellipse cx="49" cy="66" rx="4" ry="4.5" fill="#1a0a00" />
        <ellipse cx="65" cy="66" rx="4" ry="4.5" fill="#1a0a00" />
        <ellipse cx="50" cy="64.5" rx="1.5" ry="1.5" fill="white" opacity="0.6" />
        <ellipse cx="66" cy="64.5" rx="1.5" ry="1.5" fill="white" opacity="0.6" />
        <ellipse cx="57" cy="72" rx="3" ry="2" fill="#b07050" />
        {state === "sad" && <path d="M48 82 Q57 76 66 82" stroke="#1a0a00" strokeWidth="2" strokeLinecap="round" fill="none" />}
        {state === "happy" && <path d="M48 78 Q57 86 66 78" stroke="#1a0a00" strokeWidth="2" strokeLinecap="round" fill="none" />}
        {(state === "idle" || state === "searching") && <path d="M50 80 Q57 83 64 80" stroke="#1a0a00" strokeWidth="2" strokeLinecap="round" fill="none" />}
        {state === "sad" && <>
          <ellipse cx="47" cy="76" rx="1.5" ry="2" fill="#5599cc" className="tear left-tear" />
          <ellipse cx="67" cy="76" rx="1.5" ry="2" fill="#5599cc" className="tear right-tear" />
        </>}
        <rect x="49" y="92" width="16" height="12" rx="3" fill="#c8956b" />
        <path d="M20 105 Q30 100 57 100 Q84 100 95 105 L98 165 Q85 170 57 172 Q29 170 16 165 Z" fill="#1a2e1a" />
        <path d="M22 120 Q57 118 92 120" stroke="#c9963a" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M22 128 Q57 126 92 128" stroke="#8B1A1A" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M22 136 Q57 134 92 136" stroke="#c9963a" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M20 110 Q10 125 14 145" stroke="#c8956b" strokeWidth="10" strokeLinecap="round" fill="none" />
        <path d="M95 110 Q100 125 90 140" stroke="#c8956b" strokeWidth="10" strokeLinecap="round" fill="none" />
        <ellipse cx="13" cy="148" rx="7" ry="6" fill="#c8956b" />
        <ellipse cx="90" cy="143" rx="7" ry="6" fill="#c8956b" />
        <rect x="37" y="170" width="14" height="28" rx="5" fill="#c8956b" />
        <rect x="63" y="170" width="14" height="28" rx="5" fill="#c8956b" />
        <ellipse cx="44" cy="199" rx="10" ry="5" fill="#8a5a30" />
        <ellipse cx="70" cy="199" rx="10" ry="5" fill="#8a5a30" />
        {(state === "idle" || state === "searching") && (
          <g className={state === "searching" ? "magnifier-spin" : ""}>
            <circle cx="13" cy="148" r="10" stroke="#c9963a" strokeWidth="2.5" fill="none" />
            <line x1="20" y1="155" x2="28" y2="163" stroke="#c9963a" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}
      </svg>
    </div>
  );
}

type Business = {
  id: string;
  name: string;
  category: string;
  city: string;
  description?: string;
  photos?: string[];
};

function SearchPageInner() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchParams = useSearchParams();

  // On load, if there's a ?q= in the URL, auto-search with it
  useEffect(() => {
    const q = searchParams.get("q") || "";
    if (q) {
      setQuery(q);
      doSearch(q, "", "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const CITIES = ["Kohima","Dimapur","Mokokchung","Mon","Tuensang","Wokha","Phek","Zunheboto","Peren","Longleng","Kiphire","Noklak","Shamator","Tseminyü","Chümoukedima","Niuland","Meluri"];
  const CATEGORIES = ["Restaurant","Hotel","Shop","Healthcare","Education","Tourism","Transport","Services","Agriculture","Handicraft"];

  const warriorState = loading ? "searching" : !hasSearched ? "idle" : results.length === 0 ? "sad" : "happy";

  async function doSearch(q: string, city: string, category: string) {
    setLoading(true);
    setHasSearched(true);
    try {
      let builder = supabase.from("businesses").select("*");
      if (q.trim()) builder = builder.ilike("name", `%${q}%`);
      if (city) builder = builder.eq("city", city);
      if (category) builder = builder.eq("category", category);
      const { data } = await builder.limit(24);
      setResults(data ?? []);
    } finally {
      setLoading(false);
    }
  }

  function handleInput(val: string) {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val, selectedCity, selectedCategory), 400);
  }

  function handleFilter(city: string, category: string) {
    setSelectedCity(city);
    setSelectedCategory(category);
    doSearch(query, city, category);
  }

  return (
    <>
      <style>{styles}</style>
      <div className="search-page">

        <header className="search-header">
          <Link href="/" className="logo-link">Discover<span>Nagaland</span></Link>
          <div style={{ flex: 1 }} />
          <Link href="/register" className="list-btn">+ List a Business</Link>
        </header>

        <div className="search-hero">
          <h1>Find Businesses in <em>Nagaland</em></h1>
          <p>Search across all 17 districts · restaurants, hotels, shops &amp; more</p>
          <div className="search-box-wrap">
            <input
              className="search-input"
              type="text"
              placeholder="Search by name, category, or keyword…"
              value={query}
              onChange={(e) => handleInput(e.target.value)}
              autoFocus
            />
            <span className="search-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
          </div>
          <div className="filters">
            <select className="filter-select" value={selectedCity} onChange={(e) => handleFilter(e.target.value, selectedCategory)}>
              <option value="">All Districts</option>
              {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="filter-select" value={selectedCategory} onChange={(e) => handleFilter(selectedCity, e.target.value)}>
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="content">
          <div className="mascot-col">
            <NagaWarrior state={warriorState} />
            <div className="mascot-label">
              {warriorState === "idle" && <><strong>Warrior Dzü</strong>Your guide across Nagaland</>}
              {warriorState === "searching" && <><strong>Searching…</strong>Scouting the land!</>}
              {warriorState === "sad" && <><strong>Alas!</strong>Nothing found here yet.</>}
              {warriorState === "happy" && <><strong>Found them!</strong>{results.length} business{results.length !== 1 ? "es" : ""} await.</>}
            </div>
          </div>

          <div className="results-col">
            {!hasSearched && (
              <div className="state-msg">
                <h2>Start your search above</h2>
                <p>Type a name, or filter by district and category to explore.</p>
              </div>
            )}
            {hasSearched && !loading && results.length === 0 && (
              <div className="state-msg sad">
                <h2>No results found</h2>
                <p>Try a different keyword, or <Link href="/register" style={{ color: "#c9963a" }}>list your business</Link> if it&apos;s missing!</p>
              </div>
            )}
            {hasSearched && !loading && results.length > 0 && (
              <div className="results-meta">
                <strong>{results.length}</strong> result{results.length !== 1 ? "s" : ""}
                {query && <> for &ldquo;{query}&rdquo;</>}
                {selectedCity && <> in {selectedCity}</>}
              </div>
            )}
            {loading && (
              <div className="results-grid">
                {Array.from({ length: 6 }).map((_, i) => (
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
            )}
            {!loading && results.length > 0 && (
              <div className="results-grid">
                {results.map((biz) => (
                  <Link key={biz.id} href={`/business/${biz.id}`} className="biz-card">
                    {biz.photos && biz.photos[0]
                      ? <img src={biz.photos[0]} alt={biz.name} className="biz-photo" />
                      : <div className="biz-photo-placeholder">🏔️</div>
                    }
                    <div className="biz-body">
                      <div className="biz-category">{biz.category}</div>
                      <div className="biz-name">{biz.name}</div>
                      <div className="biz-city">📍 {biz.city}</div>
                      {biz.description && <div className="biz-desc">{biz.description}</div>}
                    </div>
                  </Link>
                ))}
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
    <Suspense fallback={<div style={{ background: "#0d1a0d", minHeight: "100vh" }} />}>
      <SearchPageInner />
    </Suspense>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Outfit:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0d1a0d; color: #e8ddd0; font-family: 'Outfit', sans-serif; min-height: 100vh; }
  .search-page { min-height: 100vh; background: #0d1a0d; display: flex; flex-direction: column; }
  .search-header { background: linear-gradient(180deg, #000d00 0%, #0d1a0d 100%); border-bottom: 1px solid rgba(201,150,58,0.15); padding: 1.25rem 2rem; display: flex; align-items: center; gap: 1.5rem; }
  .logo-link { font-family: 'Playfair Display', serif; font-size: 1.4rem; color: #c9963a; text-decoration: none; font-weight: 700; }
  .logo-link span { color: #e8ddd0; }
  .list-btn { color: #c9963a; text-decoration: none; font-size: 0.85rem; border: 1px solid rgba(201,150,58,0.3); padding: 0.4rem 1rem; border-radius: 8px; }
  .list-btn:hover { background: rgba(201,150,58,0.1); }
  .search-hero { background: linear-gradient(135deg, #000d00 0%, #0d1a0d 60%, #1a2e1a 100%); padding: 3rem 2rem 2rem; text-align: center; position: relative; overflow: hidden; }
  .search-hero::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 0%, rgba(201,150,58,0.08) 0%, transparent 70%); pointer-events: none; }
  .search-hero h1 { font-family: 'Playfair Display', serif; font-size: clamp(1.8rem, 4vw, 2.8rem); color: #e8ddd0; margin-bottom: 0.4rem; position: relative; }
  .search-hero h1 em { font-style: normal; color: #c9963a; }
  .search-hero p { color: #8a9a8a; margin-bottom: 2rem; font-size: 0.95rem; position: relative; }
  .search-box-wrap { max-width: 660px; margin: 0 auto; position: relative; }
  .search-input { width: 100%; padding: 1rem 3.5rem 1rem 1.4rem; background: rgba(255,255,255,0.04); border: 1.5px solid rgba(201,150,58,0.3); border-radius: 12px; color: #e8ddd0; font-family: 'Outfit', sans-serif; font-size: 1.05rem; outline: none; transition: border-color 0.2s, box-shadow 0.2s; }
  .search-input::placeholder { color: #4a5a4a; }
  .search-input:focus { border-color: #c9963a; box-shadow: 0 0 0 3px rgba(201,150,58,0.12); }
  .search-icon { position: absolute; right: 1.1rem; top: 50%; transform: translateY(-50%); color: #c9963a; pointer-events: none; }
  .filters { max-width: 660px; margin: 1rem auto 0; display: flex; gap: 0.75rem; flex-wrap: wrap; justify-content: center; }
  .filter-select { padding: 0.5rem 1rem; background: rgba(255,255,255,0.04); border: 1px solid rgba(201,150,58,0.2); border-radius: 8px; color: #e8ddd0; font-family: 'Outfit', sans-serif; font-size: 0.88rem; cursor: pointer; outline: none; flex: 1; min-width: 140px; }
  .filter-select option { background: #1a2e1a; }
  .content { flex: 1; display: flex; padding: 2rem; max-width: 1400px; margin: 0 auto; width: 100%; align-items: flex-start; gap: 2rem; }
  .mascot-col { width: 140px; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; position: sticky; top: 2rem; }
  .warrior-wrap { width: 130px; filter: drop-shadow(0 8px 24px rgba(0,0,0,0.5)); }
  .warrior-svg { width: 100%; height: auto; }
  @keyframes bob { 0%,100% { transform: translateY(0) rotate(0deg); } 25% { transform: translateY(-6px) rotate(-1deg); } 75% { transform: translateY(-3px) rotate(1deg); } }
  @keyframes search-bob { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-10px) rotate(-2deg); } }
  @keyframes magnifier-spin { 0% { transform: rotate(0deg); } 50% { transform: rotate(20deg) translate(2px,-2px); } 100% { transform: rotate(0deg); } }
  @keyframes droop { 0%,100% { transform: translateY(0); } 50% { transform: translateY(3px); } }
  @keyframes tear-drop { 0% { opacity: 0.8; transform: translateY(0); } 100% { opacity: 0; transform: translateY(12px); } }
  @keyframes celebrate { 0%,100% { transform: translateY(0) rotate(0deg); } 20% { transform: translateY(-12px) rotate(-3deg); } 60% { transform: translateY(-12px) rotate(-2deg); } 80% { transform: translateY(-4px) rotate(1deg); } }
  .warrior-idle .warrior-svg { animation: bob 3s ease-in-out infinite; }
  .warrior-searching .warrior-svg { animation: search-bob 0.7s ease-in-out infinite; }
  .warrior-searching .magnifier-spin { animation: magnifier-spin 0.8s ease-in-out infinite; }
  .warrior-sad .warrior-svg { animation: droop 2s ease-in-out infinite; }
  .warrior-sad .tear { animation: tear-drop 1.2s ease-in infinite; }
  .warrior-sad .right-tear { animation-delay: 0.4s; }
  .warrior-happy .warrior-svg { animation: celebrate 1s ease-in-out 3; }
  .mascot-label { margin-top: 0.75rem; font-size: 0.78rem; color: #8a9a8a; text-align: center; font-style: italic; line-height: 1.4; }
  .mascot-label strong { color: #c9963a; display: block; font-style: normal; margin-bottom: 0.15rem; }
  .results-col { flex: 1; }
  .results-meta { font-size: 0.9rem; color: #8a9a8a; margin-bottom: 1.25rem; padding-bottom: 0.75rem; border-bottom: 1px solid rgba(201,150,58,0.1); }
  .results-meta strong { color: #c9963a; }
  .state-msg { text-align: center; padding: 4rem 2rem; }
  .state-msg h2 { font-family: 'Playfair Display', serif; font-size: 1.5rem; color: #e8ddd0; margin-bottom: 0.5rem; }
  .state-msg p { color: #8a9a8a; font-size: 0.9rem; }
  .state-msg.sad h2 { color: #cc6666; }
  .results-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1.25rem; }
  .biz-card { background: #1a2e1a; border: 1px solid rgba(201,150,58,0.1); border-radius: 14px; overflow: hidden; text-decoration: none; color: inherit; display: block; transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s; }
  .biz-card:hover { transform: translateY(-4px); border-color: rgba(201,150,58,0.4); box-shadow: 0 12px 32px rgba(0,0,0,0.4); }
  .biz-photo { width: 100%; height: 140px; object-fit: cover; display: block; }
  .biz-photo-placeholder { width: 100%; height: 140px; background: linear-gradient(135deg, rgba(201,150,58,0.1), rgba(26,46,26,0.8)); display: flex; align-items: center; justify-content: center; font-size: 2.5rem; }
  .biz-body { padding: 1rem 1.1rem 1.2rem; }
  .biz-category { font-size: 0.72rem; color: #c9963a; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; margin-bottom: 0.3rem; }
  .biz-name { font-family: 'Playfair Display', serif; font-size: 1.05rem; color: #e8ddd0; margin-bottom: 0.4rem; line-height: 1.3; }
  .biz-city { font-size: 0.8rem; color: #8a9a8a; margin-bottom: 0.5rem; }
  .biz-desc { font-size: 0.82rem; color: #6a7a6a; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  @keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
  .skeleton { background: linear-gradient(90deg, #1a2e1a 25%, #253d25 50%, #1a2e1a 75%); background-size: 800px 100%; animation: shimmer 1.5s infinite; border-radius: 8px; }
  .skeleton-card { background: #1a2e1a; border: 1px solid rgba(201,150,58,0.05); border-radius: 14px; overflow: hidden; }
  .skeleton-img { height: 140px; width: 100%; border-radius: 0; }
  .skeleton-body { padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
  .skeleton-line { height: 12px; }
  .skeleton-line.w40 { width: 40%; }
  .skeleton-line.w80 { width: 80%; }
  .skeleton-line.w60 { width: 60%; }
  @media (max-width: 700px) {
    .content { flex-direction: column; padding: 1rem; gap: 1rem; }
    .mascot-col { width: 100%; flex-direction: row; align-items: center; gap: 1rem; position: static; }
    .warrior-wrap { width: 80px; }
    .mascot-label { margin-top: 0; text-align: left; }
    .search-hero { padding: 2rem 1rem 1.5rem; }
  }
`;

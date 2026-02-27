'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORIES } from '@/types';

const DISTRICTS = [
  'Kohima', 'Dimapur', 'Mokokchung', 'Mon', 'Tuensang', 'Wokha', 'Phek', 'Zunheboto',
  'Peren', 'Longleng', 'Kiphire', 'Noklak', 'Shamator', 'Tseminyü', 'Chümoukedima', 'Niuland', 'Meluri'
];

const MAIN_DISTRICTS = DISTRICTS.slice(0, 8);
const MORE_DISTRICTS = DISTRICTS.slice(8);

const DISTRICT_COLORS: Record<string, string> = {
  'Kohima': 'from-emerald-950 to-green-950',
  'Dimapur': 'from-red-950 to-rose-950',
  'Mokokchung': 'from-blue-950 to-sky-950',
  'Mon': 'from-purple-950 to-violet-950',
  'Tuensang': 'from-amber-950 to-yellow-950',
  'Wokha': 'from-teal-950 to-cyan-950',
  'Phek': 'from-pink-950 to-fuchsia-950',
  'Zunheboto': 'from-lime-950 to-green-950',
  'Peren': 'from-emerald-950 to-teal-950',
  'Longleng': 'from-orange-950 to-amber-950',
  'Kiphire': 'from-indigo-950 to-blue-950',
  'Noklak': 'from-red-950 to-orange-950',
  'Shamator': 'from-green-950 to-lime-950',
  'Tseminyü': 'from-violet-950 to-purple-950',
  'Chümoukedima': 'from-cyan-950 to-teal-950',
  'Niuland': 'from-yellow-950 to-orange-950',
  'Meluri': 'from-rose-950 to-pink-950',
};

const CAT_ICONS: Record<string, string> = {
  restaurant: '🍽️', cafe: '☕', hotel: '🏨', hospital: '🏥',
  pharmacy: '💊', salon: '✂️', school: '🏫', clinic: '🩺',
  turf: '⚽', pg: '🏠', coaching: '📚', rental: '🚗', shop: '🛍️', service: '🔧', other: '✦'
};

const QUICK_SEARCHES = ['Restaurants Kohima', 'Hotels Dimapur', 'Pharmacy near me', 'PG Kohima', 'Coaching centre'];

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [showMore, setShowMore] = useState(false);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <main style={{ background: '#0d1a0d', color: '#e8ddd0', fontFamily: "'Outfit', sans-serif", overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,400&family=Outfit:wght@300;400;500;600;700&display=swap');
        :root { --gold: #c9963a; --gold-light: #e8b85a; --cream: #f5ede0; --deep: #0d1a0d; --forest: #1a2e1a; }
        .playfair { font-family: 'Playfair Display', serif; }
        .label { font-size: 0.68rem; letter-spacing: 0.25em; text-transform: uppercase; color: var(--gold); font-weight: 500; margin-bottom: 14px; }
        .gold-line { width: 60px; height: 1px; background: var(--gold); opacity: 0.5; margin-bottom: 24px; }
        .hero-bg { position: absolute; inset: 0; background: url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80') center/cover no-repeat; }
        .hero-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(8,20,8,0.8) 0%, rgba(8,20,8,0.5) 40%, rgba(8,20,8,0.75) 75%, rgba(13,26,13,1) 100%); }
        .eyebrow { display: inline-flex; align-items: center; gap: 10px; border: 1px solid rgba(201,150,58,0.4); color: var(--gold); font-size: 0.72rem; letter-spacing: 0.2em; text-transform: uppercase; padding: 8px 20px; margin-bottom: 28px; font-weight: 500; }
        .eyebrow::before, .eyebrow::after { content: '✦'; font-size: 0.55rem; }
        .search-wrap { display: flex; max-width: 700px; margin: 0 auto 24px; border: 1px solid rgba(201,150,58,0.4); background: rgba(8,20,8,0.7); backdrop-filter: blur(16px); }
        .search-input { flex: 1; background: transparent; border: none; outline: none; padding: 18px 24px; color: var(--cream); font-family: 'Outfit', sans-serif; font-size: 0.97rem; font-weight: 300; }
        .search-input::placeholder { color: rgba(232,221,208,0.3); }
        .search-btn { background: var(--gold); border: none; padding: 0 36px; color: var(--deep); font-family: 'Outfit', sans-serif; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer; transition: background 0.2s; }
        .search-btn:hover { background: var(--gold-light); }
        .stag { border: 1px solid rgba(201,150,58,0.2); color: rgba(232,221,208,0.5); font-size: 0.78rem; padding: 5px 14px; cursor: pointer; transition: all 0.2s; letter-spacing: 0.04em; background: transparent; }
        .stag:hover { border-color: var(--gold); color: var(--gold); }
        .why-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 2px; background: rgba(201,150,58,0.08); }
        .why-card { background: var(--deep); padding: 52px 40px; position: relative; overflow: hidden; transition: background 0.3s; }
        .why-card:hover { background: rgba(201,150,58,0.04); }
        .why-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: var(--gold); transform: scaleX(0); transition: transform 0.4s; }
        .why-card:hover::before { transform: scaleX(1); }
        .why-num { font-family: 'Playfair Display', serif; font-size: 4rem; font-weight: 900; color: rgba(201,150,58,0.07); position: absolute; top: 16px; right: 24px; line-height: 1; }
        .district-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 3px; }
        .district-tile { padding: 36px 24px; cursor: pointer; position: relative; overflow: hidden; transition: all 0.3s; border-bottom: 2px solid transparent; text-decoration: none; display: block; }
        .district-tile:hover { border-bottom-color: var(--gold); filter: brightness(1.25); }
        .district-dot { position: absolute; inset: 0; opacity: 0.06; background-image: radial-gradient(circle, var(--gold) 1px, transparent 1px); background-size: 16px 16px; pointer-events: none; }
        .district-n { font-size: 0.6rem; letter-spacing: 0.2em; color: var(--gold); opacity: 0.6; margin-bottom: 8px; }
        .district-name { font-family: 'Playfair Display', serif; font-size: 1.05rem; color: var(--cream); font-weight: 700; margin-bottom: 14px; }
        .district-arrow { color: rgba(201,150,58,0.3); font-size: 1rem; transition: all 0.3s; }
        .district-tile:hover .district-arrow { color: var(--gold); }
        .view-more-btn { background: transparent; border: 1px solid rgba(201,150,58,0.35); color: var(--gold); padding: 12px 32px; font-family: 'Outfit', sans-serif; font-size: 0.82rem; letter-spacing: 0.1em; cursor: pointer; transition: all 0.3s; margin-top: 28px; }
        .view-more-btn:hover { background: rgba(201,150,58,0.08); }
        .cat-grid { display: grid; grid-template-columns: repeat(5,1fr); gap: 1px; background: rgba(201,150,58,0.08); }
        .cat-tile { background: var(--forest); padding: 32px 16px; text-align: center; cursor: pointer; transition: background 0.3s; position: relative; text-decoration: none; display: block; }
        .cat-tile::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: var(--gold); transform: scaleX(0); transition: transform 0.3s; }
        .cat-tile:hover { background: rgba(201,150,58,0.06); }
        .cat-tile:hover::after { transform: scaleX(1); }
        .demo-phone { width: 300px; background: #0a160a; border: 1px solid rgba(201,150,58,0.2); border-radius: 28px; padding: 22px; box-shadow: 0 40px 80px rgba(0,0,0,0.5); }
        .phone-result { background: rgba(255,255,255,0.04); border: 1px solid rgba(201,150,58,0.1); padding: 11px 13px; border-radius: 4px; display: flex; gap: 10px; align-items: flex-start; margin-bottom: 8px; }
        .cursor-blink { display: inline-block; width: 2px; height: 13px; background: var(--gold); animation: blink 1s step-end infinite; vertical-align: middle; margin-left: 1px; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        .cta-btn { display: inline-block; background: var(--gold); color: var(--deep); text-decoration: none; padding: 18px 52px; font-weight: 700; font-size: 0.82rem; letter-spacing: 0.14em; text-transform: uppercase; transition: all 0.25s; }
        .cta-btn:hover { background: var(--gold-light); transform: translateY(-2px); }
        .nav-link { color: rgba(232,221,208,0.7); text-decoration: none; font-size: 0.88rem; letter-spacing: 0.04em; transition: color 0.2s; }
        .nav-link:hover { color: var(--gold); }
        .nav-cta { background: transparent; border: 1px solid var(--gold); color: var(--gold); padding: 9px 22px; font-size: 0.78rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; text-decoration: none; transition: all 0.25s; }
        .nav-cta:hover { background: var(--gold); color: var(--deep); }
        @media (max-width: 768px) {
          .why-grid { grid-template-columns: 1fr; }
          .district-grid { grid-template-columns: repeat(2,1fr); }
          .cat-grid { grid-template-columns: repeat(3,1fr); }
          .demo-inner { flex-direction: column !important; }
        }
      `}</style>

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 48px', background: 'linear-gradient(to bottom, rgba(8,20,8,0.97), transparent)' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
          <div style={{ width: 0, height: 0, borderLeft: '13px solid transparent', borderRight: '13px solid transparent', borderBottom: '22px solid #c9963a' }} />
          <span className="playfair" style={{ fontSize: '1.2rem', color: '#c9963a', letterSpacing: '0.03em' }}>Discover Nagaland</span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <a href="/login" className="nav-link">Login</a>
          <a href="/register" className="nav-cta">List Your Business</a>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <div className="hero-bg" />
        <div className="hero-overlay" />
        <div style={{ position: 'relative', textAlign: 'center', maxWidth: 860, padding: '0 24px' }}>
          <div className="eyebrow">Nagaland&apos;s #1 Local Discovery Platform · 17 Districts</div>
          <h1 className="playfair" style={{ fontSize: 'clamp(3rem, 7vw, 6rem)', fontWeight: 900, lineHeight: 1.02, marginBottom: 20, color: '#f5ede0' }}>
            Find <em style={{ fontStyle: 'italic', color: '#c9963a' }}>anything</em><br />in Nagaland
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'rgba(232,221,208,0.6)', fontWeight: 300, marginBottom: 48, lineHeight: 1.65 }}>
            Not just a map. An AI that understands Nagaland.<br />Ask anything. Find everything. Instantly.
          </p>
          <form onSubmit={handleSearch} className="search-wrap">
            <input className="search-input" type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder='Try "best momos in Kohima" or "24hr pharmacy Dimapur"' />
            <button type="submit" className="search-btn">Search</button>
          </form>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {QUICK_SEARCHES.map((s) => (
              <button key={s} className="stag" onClick={() => router.push(`/search?q=${encodeURIComponent(s)}`)}>{s}</button>
            ))}
          </div>
        </div>
      </section>

      {/* WHY US */}
      <section style={{ padding: '100px 56px', background: '#0d1a0d' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 64, gap: 40, flexWrap: 'wrap' }}>
          <div>
            <div className="label">Why Discover Nagaland?</div>
            <div className="gold-line" />
            <h2 className="playfair" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700, color: '#f5ede0', lineHeight: 1.15 }}>
              Built for Nagaland.<br /><em style={{ fontStyle: 'italic', color: '#c9963a' }}>Not the rest of India.</em>
            </h2>
          </div>
          <p style={{ maxWidth: 360, color: 'rgba(232,221,208,0.45)', fontSize: '0.95rem', fontWeight: 300, lineHeight: 1.7 }}>
            Google Maps wasn&apos;t built with Nagaland in mind. We were.
          </p>
        </div>
        <div className="why-grid">
          {[
            { n: '01', icon: '🤖', title: 'AI That Understands You', text: 'Ask in plain language — "best cheap momos in Kohima" — and get real answers, not just pins on a map.' },
            { n: '02', icon: '📍', title: 'Actually Local', text: 'Every business is from Nagaland. No fake listings. No outdated data. Real businesses, real Nagaland.' },
            { n: '03', icon: '⚡', title: 'All 17 Districts', text: 'From Kohima to Noklak, Dimapur to Meluri — every district covered. One platform for the whole state.' },
          ].map((w) => (
            <div key={w.n} className="why-card">
              <div className="why-num">{w.n}</div>
              <div style={{ fontSize: '2rem', marginBottom: 20 }}>{w.icon}</div>
              <div className="playfair" style={{ fontSize: '1.35rem', fontWeight: 700, color: '#f5ede0', marginBottom: 12 }}>{w.title}</div>
              <p style={{ color: 'rgba(232,221,208,0.5)', fontSize: '0.9rem', fontWeight: 300, lineHeight: 1.7 }}>{w.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DEMO */}
      <section style={{ padding: '100px 56px', background: '#1a2e1a', position: 'relative', overflow: 'hidden' }}>
        <div className="demo-inner" style={{ position: 'relative', display: 'flex', gap: 80, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: 1 }}>
            <div className="label">See It In Action</div>
            <div className="gold-line" />
            <h2 className="playfair" style={{ fontSize: 'clamp(2rem, 3.5vw, 2.8rem)', fontWeight: 700, color: '#f5ede0', marginBottom: 20, lineHeight: 1.2 }}>
              This is what <em style={{ color: '#c9963a', fontStyle: 'italic' }}>smarter search</em> looks like.
            </h2>
            <p style={{ color: 'rgba(232,221,208,0.45)', fontSize: '0.95rem', fontWeight: 300, lineHeight: 1.7, marginBottom: 36 }}>
              Type a real question. Get a real answer — not 200 irrelevant results.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: 'rgba(0,0,0,0.2)', borderLeft: '2px solid transparent' }}>
                <span>✦</span>
                <span style={{ fontSize: '0.9rem', color: 'rgba(232,221,208,0.7)', fontWeight: 300 }}><strong style={{ color: '#e8ddd0' }}>Google Maps:</strong> Shows you pins. You figure out the rest.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: 'rgba(0,0,0,0.2)', borderLeft: '2px solid #c9963a' }}>
                <span style={{ color: '#c9963a' }}>★</span>
                <span style={{ fontSize: '0.9rem', color: 'rgba(232,221,208,0.7)', fontWeight: 300 }}><strong style={{ color: '#c9963a' }}>Discover Nagaland:</strong> Asks what you need. Finds the best match. Done.</span>
              </div>
            </div>
          </div>
          <div style={{ flexShrink: 0 }}>
            <div className="demo-phone">
              <div style={{ width: 70, height: 5, background: 'rgba(201,150,58,0.2)', borderRadius: 3, margin: '0 auto 18px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span className="playfair" style={{ fontSize: '0.82rem', color: '#c9963a' }}>Discover Nagaland</span>
                <span style={{ fontSize: '0.65rem', color: 'rgba(232,221,208,0.3)' }}>Kohima</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,150,58,0.2)', padding: '11px 14px', marginBottom: 14, fontSize: '0.78rem' }}>
                <span style={{ color: '#f5ede0' }}>best momos in Kohima</span><span className="cursor-blink" />
              </div>
              {[
                { e: '🍜', name: 'Naga Kitchen', detail: 'NST Road · Open · ★ 4.8', badge: 'Best' },
                { e: '🥟', name: 'Momo Corner', detail: 'Near NST · Open · ★ 4.6' },
                { e: '🍽️', name: 'Dzükou Valley Eats', detail: '5 min walk · Open · ★ 4.5' },
              ].map((r) => (
                <div key={r.name} className="phone-result">
                  <span style={{ fontSize: '1.3rem' }}>{r.e}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f5ede0', marginBottom: 2 }}>{r.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(232,221,208,0.4)' }}>{r.detail}</div>
                  </div>
                  {r.badge && <span style={{ fontSize: '0.62rem', background: 'rgba(201,150,58,0.15)', color: '#c9963a', padding: '2px 8px', alignSelf: 'center' }}>{r.badge}</span>}
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, padding: '9px 12px', background: 'rgba(201,150,58,0.07)', border: '1px solid rgba(201,150,58,0.12)', fontSize: '0.7rem', color: '#c9963a' }}>
                ✦ AI matched these based on ratings & location
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DISTRICTS */}
      <section style={{ padding: '100px 56px', background: '#0d1a0d' }}>
        <div className="label">Explore by District</div>
        <div className="gold-line" />
        <h2 className="playfair" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700, color: '#f5ede0', marginBottom: 12 }}>Browse by District</h2>
        <p style={{ color: 'rgba(232,221,208,0.35)', fontSize: '0.88rem', fontWeight: 300, marginBottom: 48 }}>All 17 districts of Nagaland — find businesses wherever you are.</p>
        <div className="district-grid">
          {MAIN_DISTRICTS.map((d, i) => (
            <a key={d} href={`/search?q=${d}`} className={`district-tile bg-gradient-to-br ${DISTRICT_COLORS[d]}`}>
              <div className="district-dot" />
              <div style={{ position: 'relative' }}>
                <div className="district-n">0{i + 1}</div>
                <div className="district-name">{d}</div>
                <div className="district-arrow">→</div>
              </div>
            </a>
          ))}
          {showMore && MORE_DISTRICTS.map((d, i) => (
            <a key={d} href={`/search?q=${d}`} className={`district-tile bg-gradient-to-br ${DISTRICT_COLORS[d]}`}>
              <div className="district-dot" />
              <div style={{ position: 'relative' }}>
                <div className="district-n">{String(i + 9).padStart(2, '0')}</div>
                <div className="district-name">{d}</div>
                <div className="district-arrow">→</div>
              </div>
            </a>
          ))}
        </div>
        <div style={{ textAlign: 'center' }}>
          <button className="view-more-btn" onClick={() => setShowMore(!showMore)}>
            {showMore ? '− Show Less' : `+ ${MORE_DISTRICTS.length} More Districts`}
          </button>
        </div>
      </section>

      {/* CATEGORIES */}
      <section style={{ padding: '100px 56px', background: '#1a2e1a' }}>
        <div className="label">What are you looking for?</div>
        <div className="gold-line" />
        <h2 className="playfair" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700, color: '#f5ede0', marginBottom: 56 }}>Browse by Category</h2>
        <div className="cat-grid">
          {CATEGORIES.map((cat) => (
            <a key={cat} href={`/search?q=${cat}`} className="cat-tile">
              <div style={{ fontSize: '1.8rem', marginBottom: 10 }}>{CAT_ICONS[cat] || '✦'}</div>
              <div style={{ fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'rgba(232,221,208,0.55)', fontWeight: 500 }}>{cat}</div>
            </a>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '140px 56px', textAlign: 'center', background: '#0d1a0d', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', fontFamily: 'Playfair Display, serif', fontSize: '20vw', fontWeight: 900, color: 'rgba(201,150,58,0.03)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', whiteSpace: 'nowrap', pointerEvents: 'none' }}>NAGALAND</div>
        <div style={{ position: 'relative' }}>
          <div className="label" style={{ marginBottom: 16 }}>For Business Owners</div>
          <div className="gold-line" style={{ margin: '0 auto 40px' }} />
          <h2 className="playfair" style={{ fontSize: 'clamp(2.5rem, 5.5vw, 4.5rem)', fontWeight: 900, color: '#f5ede0', lineHeight: 1.05, marginBottom: 20 }}>
            Own a business<br />in <em style={{ fontStyle: 'italic', color: '#c9963a' }}>Nagaland?</em>
          </h2>
          <p style={{ color: 'rgba(232,221,208,0.4)', fontSize: '1rem', fontWeight: 300, maxWidth: 440, margin: '0 auto 52px', lineHeight: 1.7 }}>
            Get found by thousands of people searching right now. Free to list. Always.
          </p>
          <a href="/register" className="cta-btn">List Your Business — It&apos;s Free</a>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#060e06', padding: '36px 56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(201,150,58,0.08)' }}>
        <span className="playfair" style={{ color: '#c9963a', fontSize: '1rem' }}>Discover Nagaland</span>
        <span style={{ fontSize: '0.78rem', color: 'rgba(232,221,208,0.25)', letterSpacing: '0.04em' }}>© 2026 · Made with pride for Nagaland</span>
      </footer>
    </main>
  );
}

const FEATURES = [
  {
    icon: '📍',
    title: 'Reach buyers across Nagaland',
    desc: 'Your listing is visible to buyers and renters in all 17 districts.',
  },
  {
    icon: '📞',
    title: 'Call & WhatsApp contact buttons',
    desc: 'Leads can reach you directly with one tap — no middlemen.',
  },
  {
    icon: '✏️',
    title: 'Edit anytime',
    desc: 'Update price, photos, or details whenever you need to.',
  },
]

export default function RealEstatePricingPage() {
  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', fontFamily: "'Sora', sans-serif", color: '#f0f0f0' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0a; }

        .nav { position: sticky; top: 0; z-index: 50; background: rgba(10,10,10,0.92); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.07); padding: 0 24px; height: 58px; display: flex; align-items: center; justify-content: space-between; }
        .nav-left { display: flex; align-items: center; gap: 8px; }
        .nav-logo { font-size: 14px; font-weight: 700; color: #fff; text-decoration: none; }
        .nav-sep { color: rgba(255,255,255,0.25); font-size: 12px; }
        .nav-crumb { font-size: 13px; color: rgba(255,255,255,0.38); text-decoration: none; transition: color 0.15s; }
        .nav-crumb:hover { color: rgba(255,255,255,0.85); }
        .nav-tag { font-size: 11.5px; font-weight: 600; color: #c0392b; background: rgba(192,57,43,0.08); border: 1px solid rgba(192,57,43,0.25); padding: 3px 10px; border-radius: 999px; }
        .nav-back { font-size: 13px; color: rgba(255,255,255,0.38); text-decoration: none; transition: color 0.15s; }
        .nav-back:hover { color: rgba(255,255,255,0.85); }

        .wrap { max-width: 680px; margin: 0 auto; padding: 64px 20px 96px; }

        .hero { text-align: center; margin-bottom: 44px; }
        .hero-eyebrow { display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #c0392b; background: rgba(192,57,43,0.08); border: 1px solid rgba(192,57,43,0.2); padding: 5px 14px; border-radius: 999px; margin-bottom: 22px; }
        .hero-title { font-size: clamp(28px, 5vw, 44px); font-weight: 800; letter-spacing: -0.03em; line-height: 1.15; color: #fff; margin-bottom: 16px; }
        .hero-sub { font-size: 15px; color: rgba(255,255,255,0.48); line-height: 1.7; max-width: 480px; margin: 0 auto 32px; }
        .hero-cta { display: inline-block; background: #c0392b; color: #fff; font-size: 15px; font-weight: 700; letter-spacing: -0.01em; padding: 14px 32px; border-radius: 10px; text-decoration: none; transition: background 0.15s; }
        .hero-cta:hover { background: #a93226; }

        .features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 40px; }
        .feat { background: #111; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 20px 18px; }
        .feat-icon { font-size: 22px; margin-bottom: 10px; }
        .feat-title { font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.88); margin-bottom: 6px; line-height: 1.35; }
        .feat-desc { font-size: 12px; color: rgba(255,255,255,0.35); line-height: 1.6; }

        .footnote { text-align: center; font-size: 12.5px; color: rgba(255,255,255,0.28); line-height: 1.6; }
        .footnote span { color: rgba(255,255,255,0.5); font-weight: 600; }

        @media (max-width: 600px) {
          .wrap { padding: 44px 16px 72px; }
          .features { grid-template-columns: 1fr; }
          .hero-cta { width: 100%; text-align: center; }
        }
      `}</style>

      {/* NAV */}
      <nav className="nav">
        <div className="nav-left">
          <a href="/" className="nav-logo">Yana Nagaland</a>
          <span className="nav-sep">/</span>
          <a href="/real-estate" className="nav-crumb">Real Estate</a>
          <span className="nav-sep">/</span>
          <span className="nav-tag">Free Listings</span>
        </div>
        <a href="/real-estate/dashboard" className="nav-back">← Dashboard</a>
      </nav>

      <main className="wrap">

        {/* HERO */}
        <div className="hero">
          <div className="hero-eyebrow">Free during launch</div>
          <h1 className="hero-title">List your property for free</h1>
          <p className="hero-sub">
            We&apos;re in our early days — all listings are free while we grow.
            Pricing will be introduced soon.
          </p>
          <a href="/real-estate/dashboard/add-property" className="hero-cta">
            List Your Property Free →
          </a>
        </div>

        {/* FEATURES */}
        <div className="features">
          {FEATURES.map(f => (
            <div key={f.title} className="feat">
              <div className="feat-icon">{f.icon}</div>
              <div className="feat-title">{f.title}</div>
              <div className="feat-desc">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* FOOTNOTE */}
        <p className="footnote">
          <span>Early listers will always get the best rate</span> when pricing is introduced.
        </p>

      </main>
    </div>
  )
}

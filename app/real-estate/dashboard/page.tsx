'use client'

export default function RealEstateDashboard() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: "'Sora', sans-serif", color: 'var(--white)' }}>
      <style>{`
        :root{--bg:#0a0a0a;--bg2:#111111;--bg3:#161616;--bg4:#1e1e1e;--border:rgba(255,255,255,0.07);--border2:rgba(255,255,255,0.12);--white:#ffffff;--off:rgba(255,255,255,0.85);--muted:rgba(255,255,255,0.38);--red:#c0392b;--red2:#a93226;--red-bg:rgba(192,57,43,0.08);}
        body{background:var(--bg);margin:0;padding:0;}
        body::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse 60% 50% at 20% 0%,rgba(139,0,0,0.09) 0%,transparent 60%);pointer-events:none;z-index:0;}
        .red-nav{position:sticky;top:0;z-index:50;background:rgba(10,10,10,0.92);backdrop-filter:blur(20px);border-bottom:1px solid var(--border);padding:0 24px;height:58px;display:flex;align-items:center;justify-content:space-between;}
        .red-nav-left{display:flex;align-items:center;gap:10px;}
        .red-nav-logo{font-size:15px;font-weight:700;color:var(--white);text-decoration:none;}
        .red-nav-sep{color:var(--muted);font-size:13px;margin:0 4px;}
        .red-nav-tag{font-size:12px;font-weight:600;color:var(--red);background:var(--red-bg);border:1px solid rgba(192,57,43,0.25);padding:3px 10px;border-radius:999px;}
        .red-nav-back{font-size:13px;color:var(--muted);text-decoration:none;display:flex;align-items:center;gap:5px;transition:color 0.15s;}
        .red-nav-back:hover{color:var(--off);}
        .red-wrap{position:relative;z-index:1;max-width:900px;margin:0 auto;padding:60px 24px 80px;}
        .red-header{margin-bottom:48px;}
        .red-eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:var(--red);background:var(--red-bg);border:1px solid rgba(192,57,43,0.2);padding:5px 14px;border-radius:999px;margin-bottom:20px;}
        .red-title{font-size:clamp(26px,4vw,38px);font-weight:800;line-height:1.15;letter-spacing:-0.025em;color:var(--white);margin-bottom:10px;}
        .red-sub{font-size:15px;color:var(--muted);font-weight:300;line-height:1.6;max-width:520px;}
        .red-coming-badge{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:600;color:rgba(212,160,23,0.9);background:rgba(212,160,23,0.07);border:1px solid rgba(212,160,23,0.2);padding:4px 12px;border-radius:999px;margin-top:16px;}
        .red-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;margin-bottom:48px;}
        .red-action-card{background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:24px 22px;display:flex;flex-direction:column;gap:12px;cursor:not-allowed;transition:all 0.15s;position:relative;overflow:hidden;}
        .red-action-card::after{content:'Coming soon';position:absolute;top:12px;right:12px;font-size:9px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted);background:var(--bg3);border:1px solid var(--border);padding:2px 8px;border-radius:999px;}
        .red-action-card:hover{border-color:rgba(192,57,43,0.22);background:rgba(192,57,43,0.03);}
        .red-card-icon{font-size:28px;line-height:1;}
        .red-card-title{font-size:15px;font-weight:600;color:var(--off);}
        .red-card-desc{font-size:12.5px;color:var(--muted);line-height:1.5;}
        .red-info-box{background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:28px 28px;display:flex;align-items:flex-start;gap:16px;}
        .red-info-icon{font-size:22px;margin-top:2px;flex-shrink:0;}
        .red-info-title{font-size:14px;font-weight:600;color:var(--off);margin-bottom:5px;}
        .red-info-text{font-size:13px;color:var(--muted);line-height:1.6;}
        .red-info-link{display:inline-block;margin-top:14px;font-size:13px;font-weight:600;color:var(--red);text-decoration:none;transition:opacity 0.15s;}
        .red-info-link:hover{opacity:0.7;}
        @media(max-width:600px){.red-wrap{padding:40px 16px 60px;}.red-grid{grid-template-columns:1fr 1fr;}}
      `}</style>

      {/* NAV */}
      <nav className="red-nav">
        <div className="red-nav-left">
          <a href="/" className="red-nav-logo">Yana Nagaland</a>
          <span className="red-nav-sep">/</span>
          <a href="/real-estate" className="red-nav-logo" style={{ fontWeight: 400, fontSize: 14, color: 'var(--muted)' }}>Real Estate</a>
          <span className="red-nav-sep">/</span>
          <span className="red-nav-tag">Owner Dashboard</span>
        </div>
        <a href="/real-estate" className="red-nav-back">← Back to listings</a>
      </nav>

      <div className="red-wrap">
        {/* HEADER */}
        <div className="red-header">
          <div className="red-eyebrow">
            <span>🏡</span>
            <span>Real Estate Dashboard</span>
          </div>
          <h1 className="red-title">Manage Your<br />Property Listings</h1>
          <p className="red-sub">
            List land, houses, apartments, and commercial spaces.
            Reach buyers and renters across Nagaland.
          </p>
          <div className="red-coming-badge">
            <span>⚡</span>
            <span>Full dashboard coming soon</span>
          </div>
        </div>

        {/* ACTION CARDS */}
        <div className="red-grid">
          {[
            { icon: '➕', title: 'Add Property', desc: 'Post a new land, house, apartment, or rental listing.' },
            { icon: '🏘', title: 'My Properties', desc: 'View and manage all your active listings.' },
            { icon: '✏️', title: 'Edit Listings', desc: 'Update photos, pricing, and property details.' },
            { icon: '✅', title: 'Mark as Sold / Rented', desc: 'Close a listing when your property is no longer available.' },
          ].map(card => (
            <div key={card.title} className="red-action-card">
              <div className="red-card-icon">{card.icon}</div>
              <div>
                <div className="red-card-title">{card.title}</div>
                <div className="red-card-desc">{card.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* INFO BOX */}
        <div className="red-info-box">
          <div className="red-info-icon">📋</div>
          <div>
            <div className="red-info-title">This area is under development</div>
            <div className="red-info-text">
              The Real Estate owner dashboard is being built as a dedicated product area — separate from the main business directory.
              Property listing, verification, and management tools will be available here soon.
            </div>
            <a href="/real-estate" className="red-info-link">← Browse current listings</a>
          </div>
        </div>
      </div>
    </div>
  )
}

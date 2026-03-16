'use client'

export default function RealEstateDashboard() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: "'Sora', sans-serif", color: 'var(--white)' }}>
      <style>{`
        :root{--bg:#0a0a0a;--bg2:#111111;--bg3:#161616;--bg4:#1e1e1e;--border:rgba(255,255,255,0.07);--border2:rgba(255,255,255,0.12);--white:#ffffff;--off:rgba(255,255,255,0.85);--muted:rgba(255,255,255,0.38);--red:#c0392b;--red2:#a93226;--red-bg:rgba(192,57,43,0.08);--gold:#e8a908;--gold-bg:rgba(232,169,8,0.08);--teal:#3ba88f;--teal-bg:rgba(59,168,143,0.08);}
        body{background:var(--bg);margin:0;padding:0;}
        body::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse 60% 50% at 20% 0%,rgba(139,0,0,0.08) 0%,transparent 60%);pointer-events:none;z-index:0;}
        .dn{position:sticky;top:0;z-index:50;background:rgba(10,10,10,0.92);backdrop-filter:blur(20px);border-bottom:1px solid var(--border);padding:0 24px;height:58px;display:flex;align-items:center;justify-content:space-between;}
        .dn-left{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
        .dn-logo{font-size:14px;font-weight:700;color:var(--white);text-decoration:none;}
        .dn-sep{color:var(--muted);font-size:12px;}
        .dn-crumb{font-size:13px;color:var(--muted);text-decoration:none;transition:color 0.15s;}
        .dn-crumb:hover{color:var(--off);}
        .dn-tag{font-size:11.5px;font-weight:600;color:var(--red);background:var(--red-bg);border:1px solid rgba(192,57,43,0.25);padding:3px 10px;border-radius:999px;}
        .dn-back{font-size:13px;color:var(--muted);text-decoration:none;transition:color 0.15s;}
        .dn-back:hover{color:var(--off);}
        .dw{position:relative;z-index:1;max-width:960px;margin:0 auto;padding:48px 24px 80px;}
        .dw-head{margin-bottom:36px;}
        .dw-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:10.5px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--red);background:var(--red-bg);border:1px solid rgba(192,57,43,0.2);padding:5px 13px;border-radius:999px;margin-bottom:16px;}
        .dw-title{font-size:clamp(24px,3.8vw,34px);font-weight:800;line-height:1.15;letter-spacing:-0.025em;color:var(--white);margin-bottom:8px;}
        .dw-sub{font-size:14px;color:var(--muted);line-height:1.6;max-width:480px;}
        .dw-earlybar{display:flex;align-items:center;gap:10px;background:var(--gold-bg);border:1px solid rgba(232,169,8,0.18);border-radius:12px;padding:10px 16px;margin-bottom:36px;}
        .dw-earlybar-dot{width:7px;height:7px;border-radius:50%;background:var(--gold);flex-shrink:0;}
        .dw-earlybar-text{font-size:12.5px;color:rgba(232,169,8,0.85);line-height:1.5;}
        .dw-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:36px;}
        .dw-stat{background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:18px 20px;}
        .dw-stat-val{font-size:26px;font-weight:800;letter-spacing:-0.04em;color:var(--white);margin-bottom:4px;}
        .dw-stat-label{font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--muted);}
        .dw-stat-note{font-size:10.5px;color:rgba(255,255,255,0.2);margin-top:6px;}
        .dw-add{background:var(--bg2);border:1px solid rgba(192,57,43,0.3);border-radius:16px;padding:28px 28px;display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:28px;cursor:not-allowed;transition:border-color 0.15s;}
        .dw-add:hover{border-color:rgba(192,57,43,0.5);background:rgba(192,57,43,0.04);}
        .dw-add-left{display:flex;align-items:center;gap:16px;}
        .dw-add-icon{width:44px;height:44px;background:var(--red-bg);border:1px solid rgba(192,57,43,0.25);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}
        .dw-add-title{font-size:16px;font-weight:700;color:var(--white);margin-bottom:3px;}
        .dw-add-desc{font-size:13px;color:var(--muted);}
        .dw-add-cta{font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--red);background:var(--red-bg);border:1px solid rgba(192,57,43,0.25);padding:8px 18px;border-radius:8px;white-space:nowrap;flex-shrink:0;}
        .dw-section-label{font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:12px;padding-left:2px;}
        .dw-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;margin-bottom:36px;}
        .dw-card{background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:22px 20px;display:flex;flex-direction:column;gap:10px;cursor:not-allowed;transition:all 0.15s;position:relative;}
        .dw-card:hover{border-color:var(--border2);background:var(--bg3);}
        .dw-card-badge{position:absolute;top:12px;right:12px;font-size:9px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:rgba(255,255,255,0.2);background:var(--bg3);border:1px solid var(--border);padding:2px 7px;border-radius:999px;}
        .dw-card-icon{font-size:24px;line-height:1;}
        .dw-card-title{font-size:14px;font-weight:600;color:var(--off);}
        .dw-card-desc{font-size:12px;color:var(--muted);line-height:1.55;}
        .dw-pricing{background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:28px 28px;margin-bottom:28px;}
        .dw-pricing-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:20px;}
        .dw-pricing-title{font-size:15px;font-weight:700;color:var(--white);margin-bottom:4px;}
        .dw-pricing-sub{font-size:12.5px;color:var(--muted);line-height:1.55;}
        .dw-pricing-badge{font-size:10px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:var(--teal);background:var(--teal-bg);border:1px solid rgba(59,168,143,0.2);padding:3px 10px;border-radius:999px;white-space:nowrap;flex-shrink:0;}
        .dw-plans{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
        .dw-plan{background:var(--bg3);border:1px solid var(--border);border-radius:12px;padding:18px 16px;}
        .dw-plan.featured{border-color:rgba(192,57,43,0.3);background:rgba(192,57,43,0.04);}
        .dw-plan-name{font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted);margin-bottom:8px;}
        .dw-plan.featured .dw-plan-name{color:var(--red);}
        .dw-plan-price{font-size:20px;font-weight:800;letter-spacing:-0.04em;color:var(--white);margin-bottom:2px;}
        .dw-plan-cycle{font-size:11px;color:var(--muted);}
        .dw-plan-features{margin-top:12px;display:flex;flex-direction:column;gap:5px;}
        .dw-plan-feature{font-size:11.5px;color:rgba(255,255,255,0.45);display:flex;align-items:center;gap:6px;}
        .dw-plan-feature::before{content:'·';color:var(--muted);}
        @media(max-width:640px){.dw{padding:36px 16px 60px;}.dw-stats{grid-template-columns:1fr 1fr;}.dw-plans{grid-template-columns:1fr;}.dw-add{flex-direction:column;align-items:flex-start;}.dw-cards{grid-template-columns:1fr 1fr;}}
      `}</style>

      {/* NAV */}
      <nav className="dn">
        <div className="dn-left">
          <a href="/" className="dn-logo">Yana Nagaland</a>
          <span className="dn-sep">/</span>
          <a href="/real-estate" className="dn-crumb">Real Estate</a>
          <span className="dn-sep">/</span>
          <span className="dn-tag">Owner Dashboard</span>
        </div>
        <a href="/real-estate" className="dn-back">← Listings</a>
      </nav>

      <div className="dw">

        {/* HEADER */}
        <div className="dw-head">
          <div className="dw-eyebrow"><span>🏡</span><span>Owner Control Panel</span></div>
          <h1 className="dw-title">Your Property<br />Dashboard</h1>
          <p className="dw-sub">List, manage, and track your land, homes, and rentals across Nagaland.</p>
        </div>

        {/* EARLY ACCESS NOTICE */}
        <div className="dw-earlybar">
          <div className="dw-earlybar-dot" />
          <div className="dw-earlybar-text">
            <strong style={{ color: 'var(--gold)' }}>Early access open.</strong> Owner accounts and listing management are being set up. Full dashboard activates soon.
          </div>
        </div>

        {/* STATS */}
        <div className="dw-stats">
          <div className="dw-stat">
            <div className="dw-stat-val">—</div>
            <div className="dw-stat-label">My Listings</div>
            <div className="dw-stat-note">Active properties</div>
          </div>
          <div className="dw-stat">
            <div className="dw-stat-val">—</div>
            <div className="dw-stat-label">Total Views</div>
            <div className="dw-stat-note">Coming soon</div>
          </div>
          <div className="dw-stat">
            <div className="dw-stat-val">—</div>
            <div className="dw-stat-label">Leads</div>
            <div className="dw-stat-note">Enquiries received</div>
          </div>
        </div>

        {/* ADD NEW PROPERTY — primary CTA */}
        <div className="dw-add">
          <div className="dw-add-left">
            <div className="dw-add-icon">➕</div>
            <div>
              <div className="dw-add-title">Add New Property</div>
              <div className="dw-add-desc">Post land, a house, apartment, or commercial space.</div>
            </div>
          </div>
          <div className="dw-add-cta">Coming Soon</div>
        </div>

        {/* MANAGEMENT CARDS */}
        <div className="dw-section-label">Manage Listings</div>
        <div className="dw-cards">
          {[
            { icon: '🏘', title: 'My Listings', desc: 'View all your active and past property listings.' },
            { icon: '✏️', title: 'Edit Property', desc: 'Update photos, price, and details anytime.' },
            { icon: '✅', title: 'Mark Sold / Rented', desc: 'Close a listing once your property is taken.' },
            { icon: '📊', title: 'Listing Analytics', desc: 'Track views and enquiries per property.' },
          ].map(c => (
            <div key={c.title} className="dw-card">
              <span className="dw-card-badge">Soon</span>
              <div className="dw-card-icon">{c.icon}</div>
              <div className="dw-card-title">{c.title}</div>
              <div className="dw-card-desc">{c.desc}</div>
            </div>
          ))}
        </div>

        {/* PRICING */}
        <div className="dw-section-label">Property Listing Plans</div>
        <div className="dw-pricing">
          <div className="dw-pricing-head">
            <div>
              <div className="dw-pricing-title">Real Estate Pricing</div>
              <div className="dw-pricing-sub">Separate from the main business directory. Plans are being finalised — early listings are free.</div>
            </div>
            <div className="dw-pricing-badge">Coming Soon</div>
          </div>
          <div className="dw-plans">
            <div className="dw-plan">
              <div className="dw-plan-name">Free</div>
              <div className="dw-plan-price">₹0</div>
              <div className="dw-plan-cycle">during early access</div>
              <div className="dw-plan-features">
                <div className="dw-plan-feature">1 active listing</div>
                <div className="dw-plan-feature">Basic detail page</div>
                <div className="dw-plan-feature">Public visibility</div>
              </div>
            </div>
            <div className="dw-plan featured">
              <div className="dw-plan-name">Pro Listing</div>
              <div className="dw-plan-price">TBD</div>
              <div className="dw-plan-cycle">pricing being decided</div>
              <div className="dw-plan-features">
                <div className="dw-plan-feature">Up to 10 photos</div>
                <div className="dw-plan-feature">Featured badge</div>
                <div className="dw-plan-feature">Priority placement</div>
              </div>
            </div>
            <div className="dw-plan">
              <div className="dw-plan-name">Agent / Broker</div>
              <div className="dw-plan-price">TBD</div>
              <div className="dw-plan-cycle">pricing being decided</div>
              <div className="dw-plan-features">
                <div className="dw-plan-feature">Unlimited listings</div>
                <div className="dw-plan-feature">Lead notifications</div>
                <div className="dw-plan-feature">Analytics dashboard</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

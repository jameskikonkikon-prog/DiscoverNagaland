'use client'

export default function AddPropertyPage() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: "'Sora', sans-serif", color: 'var(--white)' }}>
      <style>{`
        :root{--bg:#0a0a0a;--bg2:#111111;--bg3:#161616;--bg4:#1e1e1e;--border:rgba(255,255,255,0.07);--border2:rgba(255,255,255,0.12);--white:#ffffff;--off:rgba(255,255,255,0.85);--muted:rgba(255,255,255,0.38);--red:#c0392b;--red2:#a93226;--red-bg:rgba(192,57,43,0.08);}
        body{background:var(--bg);margin:0;padding:0;}
        body::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse 60% 50% at 20% 0%,rgba(139,0,0,0.08) 0%,transparent 60%);pointer-events:none;z-index:0;}
        .an{position:sticky;top:0;z-index:50;background:rgba(10,10,10,0.92);backdrop-filter:blur(20px);border-bottom:1px solid var(--border);padding:0 24px;height:58px;display:flex;align-items:center;justify-content:space-between;}
        .an-left{display:flex;align-items:center;gap:8px;}
        .an-logo{font-size:14px;font-weight:700;color:var(--white);text-decoration:none;}
        .an-sep{color:var(--muted);font-size:12px;}
        .an-crumb{font-size:13px;color:var(--muted);text-decoration:none;transition:color 0.15s;}
        .an-crumb:hover{color:var(--off);}
        .an-tag{font-size:11.5px;font-weight:600;color:var(--red);background:var(--red-bg);border:1px solid rgba(192,57,43,0.25);padding:3px 10px;border-radius:999px;}
        .an-back{font-size:13px;color:var(--muted);text-decoration:none;transition:color 0.15s;}
        .an-back:hover{color:var(--off);}
        .aw{position:relative;z-index:1;max-width:720px;margin:0 auto;padding:48px 24px 80px;}
        .aw-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:10.5px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--red);background:var(--red-bg);border:1px solid rgba(192,57,43,0.2);padding:5px 13px;border-radius:999px;margin-bottom:16px;}
        .aw-title{font-size:clamp(22px,3.5vw,30px);font-weight:800;letter-spacing:-0.025em;color:var(--white);margin-bottom:6px;}
        .aw-sub{font-size:13.5px;color:var(--muted);line-height:1.6;margin-bottom:36px;}
        .aw-group{background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:24px 24px;margin-bottom:16px;}
        .aw-group-label{font-size:10.5px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:16px;}
        .aw-row{display:grid;gap:14px;margin-bottom:14px;}
        .aw-row:last-child{margin-bottom:0;}
        .aw-row.cols2{grid-template-columns:1fr 1fr;}
        .aw-row.cols3{grid-template-columns:1fr 1fr 1fr;}
        .aw-field{display:flex;flex-direction:column;gap:5px;}
        .aw-label{font-size:11.5px;font-weight:600;color:rgba(255,255,255,0.55);letter-spacing:0.02em;}
        .aw-input{background:var(--bg3);border:1px solid var(--border2);border-radius:10px;padding:10px 14px;font-size:14px;font-family:'Sora',sans-serif;color:var(--white);outline:none;transition:border-color 0.15s;width:100%;box-sizing:border-box;}
        .aw-input::placeholder{color:var(--muted);}
        .aw-input:focus{border-color:rgba(192,57,43,0.4);}
        .aw-select{background:var(--bg3);border:1px solid var(--border2);border-radius:10px;padding:10px 14px;font-size:14px;font-family:'Sora',sans-serif;color:var(--white);outline:none;transition:border-color 0.15s;width:100%;box-sizing:border-box;cursor:pointer;appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='rgba(255,255,255,0.3)' d='M6 8L1 3h10z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;}
        .aw-select:focus{border-color:rgba(192,57,43,0.4);}
        .aw-textarea{background:var(--bg3);border:1px solid var(--border2);border-radius:10px;padding:10px 14px;font-size:14px;font-family:'Sora',sans-serif;color:var(--white);outline:none;transition:border-color 0.15s;width:100%;box-sizing:border-box;resize:vertical;min-height:96px;line-height:1.6;}
        .aw-textarea::placeholder{color:var(--muted);}
        .aw-textarea:focus{border-color:rgba(192,57,43,0.4);}
        .aw-photo-area{background:var(--bg3);border:1.5px dashed var(--border2);border-radius:12px;padding:28px 20px;text-align:center;cursor:not-allowed;}
        .aw-photo-icon{font-size:26px;margin-bottom:8px;}
        .aw-photo-label{font-size:13px;font-weight:600;color:var(--off);margin-bottom:4px;}
        .aw-photo-sub{font-size:11.5px;color:var(--muted);}
        .aw-photo-badge{display:inline-block;margin-top:10px;font-size:10px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:var(--muted);background:var(--bg4);border:1px solid var(--border);padding:3px 10px;border-radius:999px;}
        .aw-footer{margin-top:28px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;}
        .aw-footer-note{font-size:12px;color:rgba(255,255,255,0.2);line-height:1.5;}
        .aw-submit{background:rgba(192,57,43,0.2);color:rgba(255,255,255,0.3);font-size:14px;font-weight:700;letter-spacing:0.02em;padding:12px 32px;border-radius:10px;border:1px solid rgba(192,57,43,0.2);cursor:not-allowed;font-family:'Sora',sans-serif;}
        @media(max-width:600px){.aw{padding:36px 16px 60px;}.aw-row.cols2,.aw-row.cols3{grid-template-columns:1fr;}}
      `}</style>

      {/* NAV */}
      <nav className="an">
        <div className="an-left">
          <a href="/" className="an-logo">Yana Nagaland</a>
          <span className="an-sep">/</span>
          <a href="/real-estate" className="an-crumb">Real Estate</a>
          <span className="an-sep">/</span>
          <a href="/real-estate/dashboard" className="an-crumb">Dashboard</a>
          <span className="an-sep">/</span>
          <span className="an-tag">Add Property</span>
        </div>
        <a href="/real-estate/dashboard" className="an-back">← Dashboard</a>
      </nav>

      <div className="aw">
        <div className="aw-eyebrow"><span>➕</span><span>New Listing</span></div>
        <h1 className="aw-title">Add a Property</h1>
        <p className="aw-sub">Fill in the details below. Submission flow is coming next — this form is a preview.</p>

        {/* BASIC INFO */}
        <div className="aw-group">
          <div className="aw-group-label">Basic Info</div>
          <div className="aw-row">
            <div className="aw-field">
              <label className="aw-label">Listing Title</label>
              <input className="aw-input" type="text" placeholder="e.g. 3BHK House for Sale in Kohima" disabled />
            </div>
          </div>
          <div className="aw-row cols2">
            <div className="aw-field">
              <label className="aw-label">Property Type</label>
              <select className="aw-select" disabled>
                <option value="">Select type</option>
                <option value="land">Land</option>
                <option value="house">House</option>
                <option value="apartment">Apartment</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>
            <div className="aw-field">
              <label className="aw-label">Listing Type</label>
              <select className="aw-select" disabled>
                <option value="">Select</option>
                <option value="sale">For Sale</option>
                <option value="rent">For Rent</option>
              </select>
            </div>
          </div>
        </div>

        {/* LOCATION */}
        <div className="aw-group">
          <div className="aw-group-label">Location</div>
          <div className="aw-row cols2">
            <div className="aw-field">
              <label className="aw-label">City / District</label>
              <input className="aw-input" type="text" placeholder="e.g. Kohima" disabled />
            </div>
            <div className="aw-field">
              <label className="aw-label">Locality / Area</label>
              <input className="aw-input" type="text" placeholder="e.g. Midland" disabled />
            </div>
          </div>
          <div className="aw-row">
            <div className="aw-field">
              <label className="aw-label">Landmark (optional)</label>
              <input className="aw-input" type="text" placeholder="e.g. Near DC Office" disabled />
            </div>
          </div>
        </div>

        {/* PRICING & SIZE */}
        <div className="aw-group">
          <div className="aw-group-label">Pricing & Size</div>
          <div className="aw-row cols2">
            <div className="aw-field">
              <label className="aw-label">Price (₹)</label>
              <input className="aw-input" type="number" placeholder="e.g. 2800000" disabled />
            </div>
            <div className="aw-field">
              <label className="aw-label">Price Unit</label>
              <select className="aw-select" disabled>
                <option value="">Select</option>
                <option value="total">Total</option>
                <option value="per month">Per Month</option>
                <option value="per sqft">Per Sqft</option>
              </select>
            </div>
          </div>
          <div className="aw-row cols2">
            <div className="aw-field">
              <label className="aw-label">Area</label>
              <input className="aw-input" type="number" placeholder="e.g. 1200" disabled />
            </div>
            <div className="aw-field">
              <label className="aw-label">Area Unit</label>
              <select className="aw-select" disabled>
                <option value="">Select</option>
                <option value="sqft">Sqft</option>
                <option value="bigha">Bigha</option>
                <option value="acre">Acre</option>
                <option value="gaj">Gaj</option>
              </select>
            </div>
          </div>
        </div>

        {/* DESCRIPTION */}
        <div className="aw-group">
          <div className="aw-group-label">Description</div>
          <div className="aw-row">
            <div className="aw-field">
              <label className="aw-label">About this property</label>
              <textarea className="aw-textarea" placeholder="Describe the property — location highlights, condition, access, etc." disabled />
            </div>
          </div>
        </div>

        {/* PHOTOS */}
        <div className="aw-group">
          <div className="aw-group-label">Photos</div>
          <div className="aw-photo-area">
            <div className="aw-photo-icon">📷</div>
            <div className="aw-photo-label">Upload photos</div>
            <div className="aw-photo-sub">Up to 10 images · JPG, PNG · Max 5MB each</div>
            <div className="aw-photo-badge">Photo upload coming soon</div>
          </div>
        </div>

        {/* CONTACT */}
        <div className="aw-group">
          <div className="aw-group-label">Contact Details</div>
          <div className="aw-row">
            <div className="aw-field">
              <label className="aw-label">Your Name</label>
              <input className="aw-input" type="text" placeholder="e.g. Vizolie Angami" disabled />
            </div>
          </div>
          <div className="aw-row cols2">
            <div className="aw-field">
              <label className="aw-label">Phone</label>
              <input className="aw-input" type="tel" placeholder="e.g. 9862000000" disabled />
            </div>
            <div className="aw-field">
              <label className="aw-label">WhatsApp (optional)</label>
              <input className="aw-input" type="tel" placeholder="e.g. 9862000000" disabled />
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="aw-footer">
          <div className="aw-footer-note">Submission flow coming next.<br />No data is saved when you click Submit.</div>
          <button className="aw-submit" disabled>Submit Listing</button>
        </div>
      </div>
    </div>
  )
}

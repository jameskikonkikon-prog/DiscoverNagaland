export default function NotFound() {
  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0a; }
        .nf-page {
          min-height: 100vh; display: flex; align-items: center; justify-content: center;
          padding: 2rem 1.5rem; background: #0a0a0a; font-family: 'Sora', sans-serif;
          position: relative;
        }
        .nf-page::before {
          content: ''; position: fixed; inset: 0;
          background: radial-gradient(ellipse 50% 40% at 50% 20%, rgba(192,57,43,0.05) 0%, transparent 60%);
          pointer-events: none;
        }
        .nf-wrap { text-align: center; position: relative; z-index: 1; max-width: 480px; }
        .nf-brand { display: inline-flex; align-items: baseline; gap: 6px; text-decoration: none; margin-bottom: 3rem; }
        .nf-brand-name { font-family: 'Playfair Display', Georgia, serif; font-size: 1.4rem; font-weight: 700; color: #fff; letter-spacing: 1px; }
        .nf-brand-sub { font-size: 0.5rem; letter-spacing: 0.35em; color: #555; text-transform: uppercase; }
        .nf-num { font-size: clamp(72px, 16vw, 120px); font-weight: 800; color: #1a1a1a; letter-spacing: -0.05em; line-height: 1; margin-bottom: 0.5rem; font-family: 'Sora', sans-serif; -webkit-text-stroke: 1px rgba(255,255,255,0.08); }
        .nf-title { font-family: 'Playfair Display', Georgia, serif; font-size: clamp(22px, 4vw, 30px); color: #fff; margin-bottom: 0.75rem; font-weight: 700; }
        .nf-sub { font-size: 14.5px; color: rgba(255,255,255,0.4); line-height: 1.65; margin-bottom: 2.5rem; }
        .nf-btns { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        .nf-btn-primary { background: #c0392b; color: #fff; font-size: 13.5px; font-weight: 600; padding: 11px 24px; border-radius: 10px; text-decoration: none; font-family: 'Sora', sans-serif; transition: background 0.15s; }
        .nf-btn-primary:hover { background: #a93226; }
        .nf-btn-ghost { background: transparent; color: rgba(255,255,255,0.6); font-size: 13.5px; font-weight: 500; padding: 11px 24px; border-radius: 10px; text-decoration: none; border: 1px solid rgba(255,255,255,0.12); font-family: 'Sora', sans-serif; transition: border-color 0.15s, color 0.15s; }
        .nf-btn-ghost:hover { border-color: rgba(255,255,255,0.25); color: #fff; }
      `}</style>
      <main className="nf-page">
        <div className="nf-wrap">
          <a href="/" className="nf-brand">
            <span className="nf-brand-name">Yana</span>
            <span className="nf-brand-sub">NAGALAND</span>
          </a>
          <div className="nf-num">404</div>
          <h1 className="nf-title">Page not found</h1>
          <p className="nf-sub">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
          <div className="nf-btns">
            <a href="/" className="nf-btn-primary">← Back to Home</a>
            <a href="/real-estate" className="nf-btn-ghost">Browse Real Estate</a>
          </div>
        </div>
      </main>
    </>
  );
}

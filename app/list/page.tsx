export const metadata = {
  title: 'List on Yana Nagaland',
  description: 'List your business or property on Yana Nagaland — free to get started.',
};

const OPTIONS = [
  {
    href: '/register',
    icon: '🏪',
    title: 'List a Business',
    sub: 'Shops, cafes, gyms, PG rooms, restaurants and more',
  },
  {
    href: '/real-estate/dashboard/add-property',
    icon: '🏘️',
    title: 'List a Property',
    sub: 'Houses, apartments, land, rentals and more',
  },
];

export default function ListPage() {
  return (
    <div className="list-wrap">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0a; }

        .list-wrap {
          min-height: 100vh;
          background: #0a0a0a;
          color: #f0f0f0;
          font-family: 'Sora', sans-serif;
          padding: 72px 24px 96px;
        }

        .list-inner { max-width: 760px; margin: 0 auto; }

        .list-back {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 13px; color: rgba(255,255,255,0.55);
          text-decoration: none; margin-bottom: 28px;
          transition: color 0.15s;
        }
        .list-back:hover { color: #fff; }

        .list-eyebrow {
          display: inline-block;
          font-size: 11px; font-weight: 700;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: #c0392b;
          background: rgba(192,57,43,0.08);
          border: 1px solid rgba(192,57,43,0.2);
          padding: 5px 14px; border-radius: 999px;
          margin-bottom: 18px;
        }
        .list-title {
          font-size: clamp(28px, 5vw, 40px);
          font-weight: 800; letter-spacing: -0.03em;
          line-height: 1.15; color: #fff;
          margin-bottom: 12px;
        }
        .list-sub {
          font-size: 15px; color: rgba(255,255,255,0.6);
          line-height: 1.55; margin-bottom: 40px;
          max-width: 520px;
        }

        .list-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 18px;
        }

        .list-card {
          background: #111;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          padding: 28px 24px;
          text-decoration: none;
          color: inherit;
          display: flex; flex-direction: column;
          gap: 14px;
          transition: border-color 0.18s, transform 0.18s, background 0.18s;
        }
        .list-card:hover {
          border-color: rgba(192,57,43,0.5);
          background: #141414;
          transform: translateY(-2px);
        }

        .list-card-icon {
          font-size: 34px; line-height: 1;
          width: 56px; height: 56px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(192,57,43,0.08);
          border: 1px solid rgba(192,57,43,0.2);
          border-radius: 14px;
        }
        .list-card-title {
          font-size: 19px; font-weight: 700;
          color: #fff; letter-spacing: -0.01em;
        }
        .list-card-sub {
          font-size: 13.5px; line-height: 1.5;
          color: rgba(255,255,255,0.6);
          flex: 1;
        }
        .list-card-cta {
          font-size: 13px; font-weight: 700;
          color: #c0392b; letter-spacing: -0.01em;
          margin-top: 4px;
        }

        .list-footnote {
          margin-top: 32px;
          font-size: 12.5px;
          color: rgba(255,255,255,0.45);
          text-align: center;
        }

        @media (max-width: 600px) {
          .list-wrap { padding: 52px 18px 80px; }
          .list-grid { grid-template-columns: 1fr; gap: 14px; }
          .list-card { padding: 24px 20px; }
        }
      `}</style>

      <div className="list-inner">
        <a href="/" className="list-back">← Back</a>
        <div className="list-eyebrow">Get started</div>
        <h1 className="list-title">What would you like to list?</h1>
        <p className="list-sub">Free to get started — no credit card needed. Pick the type of listing that fits.</p>

        <div className="list-grid">
          {OPTIONS.map((o) => (
            <a key={o.href} href={o.href} className="list-card">
              <div className="list-card-icon">{o.icon}</div>
              <div className="list-card-title">{o.title}</div>
              <div className="list-card-sub">{o.sub}</div>
              <div className="list-card-cta">Continue →</div>
            </a>
          ))}
        </div>

        <div className="list-footnote">Already have an account? <a href="/login" style={{ color: '#c0392b', textDecoration: 'none' }}>Sign in →</a></div>
      </div>
    </div>
  );
}

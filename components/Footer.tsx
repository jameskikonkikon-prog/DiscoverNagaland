const LINKS = [
  { href: '/', label: 'Directory' },
  { href: '/real-estate', label: 'Real Estate' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Service' },
  { href: '/refund', label: 'Refund Policy' },
  { href: '/contact', label: 'Contact Us' },
];

export default function Footer() {
  return (
    <footer style={{
      background: '#0f0f0f',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      padding: '28px 24px 110px',
      fontFamily: "'Sora', sans-serif",
    }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px', marginBottom: 16 }}>
          {LINKS.map(l => (
            <a
              key={l.href}
              href={l.href}
              style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.32)', textDecoration: 'none', transition: 'color 0.15s' }}
              onMouseOver={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
              onMouseOut={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.32)')}
            >
              {l.label}
            </a>
          ))}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.18)', lineHeight: 1.6 }}>
          © 2026 Yana Nagaland. All rights reserved.
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.12)', marginTop: 3 }}>
          Nagaland&apos;s Business &amp; Property Directory
        </div>
      </div>
    </footer>
  );
}

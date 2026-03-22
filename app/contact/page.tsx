import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Contact Us' };

export default function ContactPage() {
  return (
    <>
      <style>{styles}</style>
      <main className="lp">
        <div className="lp-wrap">
          <a href="/" className="lp-back">← Back to Yana Nagaland</a>
          <h1 className="lp-title">Contact Us</h1>
          <p className="lp-meta">Nagaland, India · yananagaland.com</p>

          <section className="lp-section">
            <h2>Get in Touch</h2>
            <p>For support, feedback, business inquiries, or to report a listing, reach out to us. We&apos;re happy to help.</p>
            <p>
              <a href="mailto:support@yananagaland.com" className="contact-email">
                support@yananagaland.com
              </a>
            </p>
            <p className="lp-note">We typically respond within 24–48 hours.</p>
          </section>

          <section className="lp-section">
            <h2>What We Can Help With</h2>
            <ul>
              <li>Account or login issues</li>
              <li>Listing management — editing, claiming, or removing a listing</li>
              <li>Billing and subscription questions</li>
              <li>Reporting incorrect, fake, or misleading listings</li>
              <li>General feedback or suggestions</li>
              <li>Business or partnership inquiries</li>
            </ul>
          </section>

          <section className="lp-section">
            <h2>Location</h2>
            <p>Nagaland, India</p>
          </section>
        </div>
      </main>
    </>
  );
}

const styles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0a0a0a; }
  .lp { min-height: 100vh; background: #0a0a0a; font-family: 'Sora', sans-serif; color: rgba(255,255,255,0.85); padding: 48px 24px 80px; }
  .lp-wrap { max-width: 720px; margin: 0 auto; }
  .lp-back { display: inline-block; font-size: 13px; color: #c0392b; text-decoration: none; margin-bottom: 36px; transition: opacity 0.15s; }
  .lp-back:hover { opacity: 0.75; }
  .lp-title { font-family: 'Playfair Display', Georgia, serif; font-size: clamp(28px, 4vw, 40px); font-weight: 700; color: #fff; margin-bottom: 12px; letter-spacing: -0.02em; }
  .lp-meta { font-size: 13px; color: rgba(255,255,255,0.35); margin-bottom: 48px; }
  .lp-section { margin-bottom: 36px; padding-bottom: 36px; border-bottom: 1px solid rgba(255,255,255,0.06); }
  .lp-section:last-child { border-bottom: none; }
  .lp-section h2 { font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 12px; letter-spacing: -0.01em; }
  .lp-section p { font-size: 14.5px; color: rgba(255,255,255,0.6); line-height: 1.75; margin-bottom: 10px; }
  .lp-section p:last-child { margin-bottom: 0; }
  .lp-section ul { padding-left: 20px; display: flex; flex-direction: column; gap: 8px; margin-top: 6px; }
  .lp-section li { font-size: 14.5px; color: rgba(255,255,255,0.6); line-height: 1.65; }
  .lp-note { font-size: 13px !important; color: rgba(255,255,255,0.35) !important; margin-top: 6px; }
  .contact-email { font-size: 16px; font-weight: 600; color: #c0392b; text-decoration: none; }
  .contact-email:hover { text-decoration: underline; }
`;

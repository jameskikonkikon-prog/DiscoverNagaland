import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Refund & Cancellation Policy' };

export default function RefundPage() {
  return (
    <>
      <style>{styles}</style>
      <main className="lp">
        <div className="lp-wrap">
          <a href="/" className="lp-back">← Back to Yana Nagaland</a>
          <h1 className="lp-title">Refund &amp; Cancellation Policy</h1>
          <p className="lp-meta">Last updated: March 2026 · Yana Nagaland (yananagaland.com)</p>

          <section className="lp-section">
            <h2>No Refunds</h2>
            <p>All payments made to Yana Nagaland are final. No refunds will be issued for any paid plan, partial billing period, or unused time.</p>
          </section>

          <section className="lp-section">
            <h2>Cancellation</h2>
            <p>You may cancel your subscription at any time from your account dashboard. Upon cancellation:</p>
            <ul>
              <li>Access to paid features continues until the end of your current billing period.</li>
              <li>After the billing period ends, your account automatically reverts to the free Basic plan.</li>
              <li>No further charges will be made after cancellation.</li>
            </ul>
          </section>

          <section className="lp-section">
            <h2>Free Plan Users</h2>
            <p>Free plan users are not charged and do not need to cancel anything.</p>
          </section>

          <section className="lp-section">
            <h2>Questions</h2>
            <p>For billing or cancellation questions, contact us at <a href="mailto:support@yananagaland.com">support@yananagaland.com</a>.</p>
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
  .lp-section ul { padding-left: 20px; display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
  .lp-section li { font-size: 14.5px; color: rgba(255,255,255,0.6); line-height: 1.65; }
  .lp-section a { color: #c0392b; text-decoration: none; }
  .lp-section a:hover { text-decoration: underline; }
`;

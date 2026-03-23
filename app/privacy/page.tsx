import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Privacy Policy' };

export default function PrivacyPage() {
  return (
    <>
      <style>{styles}</style>
      <main className="lp">
        <div className="lp-wrap">
          <a href="/" className="lp-back">← Back to Yana Nagaland</a>
          <h1 className="lp-title">Privacy Policy</h1>
          <p className="lp-meta">Last updated: March 2026 · Yana Nagaland (<a href="https://yananagaland.com">yananagaland.com</a>) · Nagaland, India</p>

          <section className="lp-section">
            <h2>Information We Collect</h2>
            <p>When you register or use our platform, we may collect:</p>
            <ul>
              <li>Name, email address, phone number, and WhatsApp number</li>
              <li>Business or property details you provide (name, address, photos, category, pricing)</li>
              <li>Location information (district, city, locality)</li>
              <li>Usage data such as pages visited, browser type, and device information</li>
            </ul>
          </section>

          <section className="lp-section">
            <h2>How We Use It</h2>
            <ul>
              <li>Display your business or property listing publicly on the platform</li>
              <li>Enable contact between visitors and listing owners</li>
              <li>Process payments for paid plans</li>
              <li>Send service emails such as email verification, password reset, and listing expiry reminders</li>
              <li>Improve and maintain the platform</li>
            </ul>
          </section>

          <section className="lp-section">
            <h2>Payments</h2>
            <p>Payments are processed securely by <strong>Razorpay</strong>. We do not store your card details, bank account information, or any other payment credentials on our servers.</p>
          </section>

          <section className="lp-section">
            <h2>Third-Party Services</h2>
            <p>We use the following third-party services, each with their own privacy policies:</p>
            <ul>
              <li><strong>Supabase</strong> — database and authentication</li>
              <li><strong>Razorpay</strong> — payment processing</li>
              <li><strong>Vercel</strong> — hosting and deployment</li>
              <li><strong>Resend</strong> — transactional email delivery</li>
            </ul>
            <p>Your data may be processed by these services as part of our operations.</p>
          </section>

          <section className="lp-section">
            <h2>Cookies</h2>
            <p>We use essential cookies only — for maintaining login sessions and remembering your consent to these terms. We do not use advertising, tracking, or analytics cookies.</p>
          </section>

          <section className="lp-section">
            <h2>Data Retention</h2>
            <p>We retain your data while your account is active. You may request deletion of your account and data at any time by emailing <a href="mailto:support@yananagaland.com">support@yananagaland.com</a>.</p>
          </section>

          <section className="lp-section">
            <h2>Your Rights</h2>
            <p>You have the right to request access to, correction of, or deletion of your personal data. To exercise these rights, email us at <a href="mailto:support@yananagaland.com">support@yananagaland.com</a>.</p>
          </section>

          <section className="lp-section">
            <h2>Children</h2>
            <p>This platform is not intended for anyone under the age of 18. We do not knowingly collect data from minors.</p>
          </section>

          <section className="lp-section">
            <h2>Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. Registered users will be notified of significant changes via email.</p>
          </section>

          <section className="lp-section">
            <h2>Governing Law</h2>
            <p>This Privacy Policy is governed by the laws of India.</p>
          </section>

          <section className="lp-section">
            <h2>Contact</h2>
            <p>For privacy-related questions: <a href="mailto:support@yananagaland.com">support@yananagaland.com</a></p>
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
  .lp-meta { font-size: 13px; color: rgba(255,255,255,0.35); margin-bottom: 48px; line-height: 1.6; }
  .lp-meta a { color: #c0392b; text-decoration: none; }
  .lp-section { margin-bottom: 36px; padding-bottom: 36px; border-bottom: 1px solid rgba(255,255,255,0.06); }
  .lp-section:last-child { border-bottom: none; }
  .lp-section h2 { font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 12px; letter-spacing: -0.01em; }
  .lp-section p { font-size: 14.5px; color: rgba(255,255,255,0.6); line-height: 1.75; margin-bottom: 10px; }
  .lp-section p:last-child { margin-bottom: 0; }
  .lp-section ul { padding-left: 20px; display: flex; flex-direction: column; gap: 7px; }
  .lp-section li { font-size: 14.5px; color: rgba(255,255,255,0.6); line-height: 1.65; }
  .lp-section a { color: #c0392b; text-decoration: none; }
  .lp-section a:hover { text-decoration: underline; }
  .lp-section strong { color: rgba(255,255,255,0.85); font-weight: 600; }
`;

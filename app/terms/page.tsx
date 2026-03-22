export default function TermsPage() {
  return (
    <>
      <style>{styles}</style>
      <main className="lp">
        <div className="lp-wrap">
          <a href="/" className="lp-back">← Back to Yana Nagaland</a>
          <h1 className="lp-title">Terms of Service</h1>
          <p className="lp-meta">Last updated: March 2026 · Yana Nagaland (yananagaland.com) · Nagaland, India</p>

          <section className="lp-section">
            <h2>Acceptance</h2>
            <p>By accessing or using yananagaland.com, you agree to these Terms of Service. If you do not agree, do not use this website.</p>
          </section>

          <section className="lp-section">
            <h2>About the Platform</h2>
            <p>Yana Nagaland is a business directory and real estate listing platform focused on Nagaland, India.</p>
            <p>Yana Nagaland operates as an intermediary as defined under the Information Technology Act, 2000. We are not liable for third-party content hosted on our platform, provided we act in accordance with applicable law upon receiving notice of any violation.</p>
          </section>

          <section className="lp-section">
            <h2>For All Users (Visitors)</h2>
            <ul>
              <li>Listings and reviews are provided by business or property owners or other users. Yana Nagaland does not verify or guarantee the accuracy of any listing.</li>
              <li>Do not rely solely on listing information for important decisions. Always verify directly with the business or property owner.</li>
              <li>Reviews are user-generated. We do not verify reviews but may remove fake, defamatory, or offensive content.</li>
              <li>We are not responsible for your experience with any business or property found on this platform.</li>
              <li>Some listings may be created by Yana Nagaland using publicly available information. These are provided for informational purposes only and may contain errors or outdated information. We encourage business owners to claim and update their listings for accuracy.</li>
            </ul>
          </section>

          <section className="lp-section">
            <h2>For Owners (Business &amp; Property Listers)</h2>
            <ul>
              <li>You must own or be authorized to represent the business or property you are listing.</li>
              <li>All information you provide must be accurate, current, and not misleading.</li>
              <li>You are responsible for keeping your listing updated. Listings not refreshed within 30 days may be hidden from public view.</li>
              <li>Once a listing is claimed by a business owner, the owner becomes responsible for the accuracy of all listing information.</li>
              <li>Do not post fake reviews for your own business or property.</li>
              <li>Photos you upload must be yours or you must have the right to use them. By uploading, you grant Yana Nagaland a non-exclusive license to display them on the platform and social media.</li>
              <li>We reserve the right to remove, suspend, or hide any listing at our sole discretion, without prior notice, if we believe it violates these terms. No compensation is owed for removed listings.</li>
            </ul>
          </section>

          <section className="lp-section">
            <h2>Real Estate Disclaimer</h2>
            <ul>
              <li>Yana Nagaland does not verify property ownership or legitimacy. Property listings are provided by users.</li>
              <li>Always verify ownership, conduct due diligence, and never make payments without proper documentation.</li>
              <li>Yana Nagaland is not a party to any real estate transaction.</li>
              <li>All prices and property details are provided by the listing owner. Prices are indicative only and may change without notice.</li>
            </ul>
          </section>

          <section className="lp-section">
            <h2>Paid Plans</h2>
            <ul>
              <li>Paid plans (Pro, Plus) are billed monthly via Razorpay and auto-renew until cancelled.</li>
              <li>All payments are final. No refunds will be issued.</li>
              <li>You can cancel anytime from your dashboard. Access continues until the end of your current billing period.</li>
              <li>Paid plans provide enhanced features and visibility. We do not guarantee any specific number of views, leads, calls, or customers.</li>
              <li>Prices may change with at least 14 days' email notice.</li>
            </ul>
          </section>

          <section className="lp-section">
            <h2>Claim Disputes</h2>
            <p>We attempt to verify claims but cannot guarantee the identity of all claimants. Disputes between parties regarding listing ownership must be resolved between them. Contact us at <a href="mailto:support@yananagaland.com">support@yananagaland.com</a> to report an unauthorized claim.</p>
          </section>

          <section className="lp-section">
            <h2>Prohibited Conduct</h2>
            <ul>
              <li>Fake listings or reviews</li>
              <li>Spam or unsolicited messaging</li>
              <li>Scraping or automated data collection</li>
              <li>Impersonation of another person or business</li>
              <li>Offensive, defamatory, or illegal content</li>
              <li>Attempting to access other users' accounts</li>
            </ul>
          </section>

          <section className="lp-section">
            <h2>Termination</h2>
            <p>We may suspend or terminate accounts that violate these terms at any time and without notice.</p>
          </section>

          <section className="lp-section">
            <h2>Limitation of Liability</h2>
            <p>The platform is provided "as is." Yana Nagaland is not liable for any loss or damage arising from use of the platform, reliance on listing information, or interactions with listed businesses or property owners.</p>
            <p>In no event shall Yana Nagaland's total liability exceed the amount paid by you to Yana Nagaland in the 3 months preceding the claim, or ₹1,000, whichever is less.</p>
          </section>

          <section className="lp-section">
            <h2>Indemnification</h2>
            <p>You agree to indemnify and hold Yana Nagaland harmless from any claims, damages, or expenses arising from your use of the platform, your listing content, or your violation of these terms.</p>
          </section>

          <section className="lp-section">
            <h2>Data Security</h2>
            <p>We implement reasonable security measures but cannot guarantee absolute security. We are not liable for unauthorized access to data resulting from events beyond our control.</p>
          </section>

          <section className="lp-section">
            <h2>Force Majeure</h2>
            <p>We are not liable for delays or failures caused by circumstances beyond our reasonable control, including natural disasters, internet outages, or government actions.</p>
          </section>

          <section className="lp-section">
            <h2>Governing Law</h2>
            <p>These terms are governed by the laws of India. Any disputes shall be subject to the jurisdiction of courts in Nagaland, India.</p>
          </section>

          <section className="lp-section">
            <h2>Contact</h2>
            <p><a href="mailto:support@yananagaland.com">support@yananagaland.com</a></p>
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
  .lp-section { margin-bottom: 36px; padding-bottom: 36px; border-bottom: 1px solid rgba(255,255,255,0.06); }
  .lp-section:last-child { border-bottom: none; }
  .lp-section h2 { font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 12px; letter-spacing: -0.01em; }
  .lp-section p { font-size: 14.5px; color: rgba(255,255,255,0.6); line-height: 1.75; margin-bottom: 10px; }
  .lp-section p:last-child { margin-bottom: 0; }
  .lp-section ul { padding-left: 20px; display: flex; flex-direction: column; gap: 8px; }
  .lp-section li { font-size: 14.5px; color: rgba(255,255,255,0.6); line-height: 1.65; }
  .lp-section a { color: #c0392b; text-decoration: none; }
  .lp-section a:hover { text-decoration: underline; }
  .lp-section strong { color: rgba(255,255,255,0.85); font-weight: 600; }
`;

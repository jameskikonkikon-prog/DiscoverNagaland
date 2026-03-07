'use client';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    price: 'Free',
    priceSub: 'Forever',
    cta: 'Start Free',
    ctaStyle: 'cta-basic',
    badge: null,
    badgeColor: null,
    features: [
      { text: 'Full listing with all details', included: true },
      { text: '2 photos, no videos', included: true },
      { text: 'WhatsApp & Call buttons', included: true },
      { text: 'Normal search position', included: true },
      { text: 'Analytics', included: false },
      { text: 'AI description writer', included: false },
      { text: 'AI menu reader', included: false },
      { text: 'Verified badge', included: false },
      { text: 'Featured placement', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₹299',
    priceSub: '/month',
    cta: 'Get Pro Free',
    ctaStyle: 'cta-pro',
    badge: 'Most Popular',
    badgeColor: '#c0392b',
    features: [
      { text: 'Full listing with all details', included: true },
      { text: '10 photos, 3 videos', included: true },
      { text: 'WhatsApp & Call buttons', included: true },
      { text: 'Higher search ranking', included: true },
      { text: 'View count & click analytics', included: true },
      { text: 'AI description writer', included: true },
      { text: 'AI menu/price list reader', included: true },
      { text: 'Listing health score', included: true },
      { text: 'Verified badge', included: false },
      { text: 'Featured placement', included: false },
    ],
  },
  {
    id: 'plus',
    name: 'Plus',
    price: '₹499',
    priceSub: '/month',
    cta: 'Upgrade to Plus',
    ctaStyle: 'cta-plus',
    badge: 'Premium',
    badgeColor: '#D4A017',
    features: [
      { text: 'Full listing with all details', included: true },
      { text: 'Unlimited photos & videos', included: true },
      { text: 'WhatsApp & Call buttons', included: true },
      { text: 'Always first in search', included: true },
      { text: 'Full analytics + monthly report', included: true },
      { text: 'AI description writer', included: true },
      { text: 'AI menu/price list reader', included: true },
      { text: 'Listing health score', included: true },
      { text: 'Verified Owner badge', included: true },
      { text: 'Featured on homepage weekly', included: true },
      { text: 'Vacancy alerts to users', included: true },
      { text: 'Festival promotion banners', included: true },
      { text: 'QR code for listing', included: true },
    ],
  },
];

const COMPARISON = [
  { feature: 'Full business listing', basic: true, pro: true, plus: true },
  { feature: 'All data fields (name, phone, price, amenities, etc.)', basic: true, pro: true, plus: true },
  { feature: 'WhatsApp & Call buttons', basic: true, pro: true, plus: true },
  { feature: 'Photos', basic: '2', pro: '10', plus: 'Unlimited' },
  { feature: 'Videos', basic: '—', pro: '3', plus: 'Unlimited' },
  { feature: 'Search ranking', basic: 'Normal', pro: 'Higher', plus: 'Always first' },
  { feature: 'AI description writer', basic: false, pro: true, plus: true },
  { feature: 'AI menu/price reader', basic: false, pro: true, plus: true },
  { feature: 'View & click analytics', basic: false, pro: true, plus: true },
  { feature: 'Listing health score', basic: false, pro: true, plus: true },
  { feature: 'Verified Owner badge', basic: false, pro: false, plus: true },
  { feature: 'Featured on homepage', basic: false, pro: false, plus: true },
  { feature: 'Vacancy alerts', basic: false, pro: false, plus: true },
  { feature: 'Festival promotion', basic: false, pro: false, plus: true },
  { feature: 'QR code', basic: false, pro: false, plus: true },
  { feature: 'Monthly report', basic: false, pro: false, plus: true },
];

const FAQ = [
  {
    q: 'Can I cancel anytime?',
    a: 'Yes, you can cancel your subscription at any time. Your plan stays active until the end of your current billing period.',
  },
  {
    q: 'What is the founding member offer?',
    a: 'The first 100 businesses to register on Yana Nagaland get the Pro plan completely free — forever. No credit card, no expiry, no catch. Once all 100 spots are claimed, Pro costs ₹299/month.',
  },
  {
    q: 'Can I upgrade later?',
    a: 'Absolutely! Start with the free Basic plan and upgrade to Pro or Plus whenever you\'re ready. You can also upgrade from Pro to Plus at any time — you only pay the difference.',
  },
  {
    q: 'What happens if I miss a payment?',
    a: 'If a payment fails, you get a 7-day grace period to update your payment method. After 7 days, your listing is automatically downgraded to the Basic (free) plan. No data is lost.',
  },
  {
    q: 'Do I lose my data if I downgrade?',
    a: 'Never. All your business information stays intact regardless of your plan. The only difference is which features are active.',
  },
  {
    q: 'Is the Basic plan really free forever?',
    a: 'Yes. The Basic plan is completely free — no card required, no hidden charges, no time limit.',
  },
];

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [foundingSpots, setFoundingSpots] = useState<{ claimed: number; remaining: number; total: number } | null>(null);

  // Fetch founding member counter
  useEffect(() => {
    fetch('/api/founding-members')
      .then(r => r.json())
      .then(data => setFoundingSpots(data))
      .catch(() => {});
  }, []);

  const ensureRazorpayScript = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && window.Razorpay) { resolve(); return; }
      const existing = document.querySelector('script[src*="razorpay"]');
      if (existing) { existing.addEventListener('load', () => resolve()); return; }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve();
      document.head.appendChild(script);
    });
  }, []);

  const handlePlanClick = useCallback(async (planId: string) => {
    if (planId === 'basic') {
      window.location.href = '/register';
      return;
    }

    setUpgrading(planId);
    setMessage('');

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = '/register';
        return;
      }

      const { data: business } = await supabase
        .from('businesses')
        .select('id, plan, is_founding_member')
        .eq('owner_id', user.id)
        .single();

      if (!business) {
        window.location.href = '/register';
        return;
      }

      const planOrder = ['basic', 'pro', 'plus'];
      if (planOrder.indexOf(business.plan) >= planOrder.indexOf(planId)) {
        setMessage(`You're already on the ${business.plan.charAt(0).toUpperCase() + business.plan.slice(1)} plan.`);
        setUpgrading(null);
        return;
      }

      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: business.id, plan: planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create order');

      // Founding member activation (free Pro, no payment)
      if (data.foundingMember) {
        setMessage(`Founding member Pro activated! You're one of the first ${100 - data.spotsRemaining}. Redirecting...`);
        setTimeout(() => { window.location.href = '/dashboard?success=upgraded'; }, 1500);
        return;
      }

      // Open Razorpay checkout
      await ensureRazorpayScript();
      const rzp = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: data.order.amount,
        currency: 'INR',
        order_id: data.order.id,
        name: 'Yana Nagaland',
        description: data.description || `${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan`,
        theme: { color: '#c0392b' },
        handler: async (response: Record<string, string>) => {
          setMessage('Verifying payment...');
          await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...response, businessId: business.id, plan: planId }),
          });
          window.location.href = '/dashboard?success=upgraded';
        },
        modal: {
          ondismiss: () => { setUpgrading(null); },
        },
      });
      rzp.open();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setUpgrading(null);
    }
  }, [ensureRazorpayScript]);

  const spotsLeft = foundingSpots?.remaining ?? null;
  const spotsClaimed = foundingSpots?.claimed ?? 0;

  return (
    <main className="pricing-page">
      <style>{styles}</style>

      <nav className="pricing-nav">
        <Link href="/" className="nav-logo">
          <svg width="34" height="40" viewBox="0 0 120 140" fill="none"><defs><linearGradient id="pinG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#8B0000"/><stop offset="50%" stopColor="#c0392b"/><stop offset="100%" stopColor="#922B21"/></linearGradient><linearGradient id="feathG" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#8B0000"/><stop offset="60%" stopColor="#c0392b"/><stop offset="100%" stopColor="#1a1a1a"/></linearGradient><radialGradient id="glassG" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#1a1a1a"/><stop offset="100%" stopColor="#0d0d0d"/></radialGradient></defs><g transform="rotate(-35, 45, 30)"><path d="M20 55 C10 40 15 15 40 0 C50 10 55 30 40 45 Z" fill="url(#feathG)"/><circle cx="20" cy="55" r="3" fill="#D4A017"/><circle cx="20" cy="55" r="1.5" fill="#8B0000"/></g><path d="M60 18 C38 18 20 36 20 58 C20 82 60 120 60 120 C60 120 100 82 100 58 C100 36 82 18 60 18Z" fill="url(#pinG)"/><path d="M42 35 L60 48 L78 35" stroke="rgba(0,0,0,0.3)" strokeWidth="2" fill="none"/><path d="M50 72 L60 62 L70 72 L60 82 Z" stroke="rgba(212,160,23,0.5)" strokeWidth="1" fill="rgba(0,0,0,0.15)"/><path d="M47 88 L60 96 L73 88" stroke="rgba(212,160,23,0.3)" strokeWidth="1" fill="none"/><circle cx="60" cy="58" r="19" fill="url(#glassG)" stroke="white" strokeWidth="2.5"/><path d="M54 52 L68 66" stroke="white" strokeWidth="2.5" strokeLinecap="round"/><path d="M54 52 L54 60 L62 52 Z" fill="white"/><line x1="74" y1="72" x2="84" y2="82" stroke="white" strokeWidth="4" strokeLinecap="round"/></svg>
          <div className="nav-logo-text">
            <span className="nav-logo-name">Yana</span>
            <span className="nav-logo-sub">NAGALAND</span>
          </div>
        </Link>
        <Link href="/register" className="nav-cta">List Your Business</Link>
      </nav>

      <section className="pricing-hero">
        <h1>Simple, transparent pricing</h1>
        <p>Every plan gives you a full listing with all business details. Upgrade for more photos, AI tools, and premium visibility.</p>
      </section>

      {/* Founding Member Banner */}
      {spotsLeft !== null && spotsLeft > 0 && (
        <div className="founding-banner">
          <div className="founding-icon">🎉</div>
          <div className="founding-text">
            <strong>Founding Member Offer — Get Pro Free Forever!</strong>
            <p>First 100 businesses get the Pro plan completely free. No credit card, no expiry.</p>
          </div>
          <div className="founding-counter">
            <div className="counter-bar">
              <div className="counter-fill" style={{ width: `${(spotsClaimed / 100) * 100}%` }} />
            </div>
            <div className="counter-text">
              <span className="counter-spots">{spotsLeft}</span> of 100 spots remaining
            </div>
          </div>
        </div>
      )}

      {spotsLeft !== null && spotsLeft === 0 && (
        <div className="founding-banner closed">
          <div className="founding-icon">🔒</div>
          <div className="founding-text">
            <strong>All 100 founding member spots have been claimed!</strong>
            <p>Pro plan is now ₹299/month. Plus plan is ₹499/month.</p>
          </div>
        </div>
      )}

      {message && (
        <div className="pricing-msg">{message}</div>
      )}

      <section className="plans-grid">
        {PLANS.map((plan) => (
          <div key={plan.id} className={`plan-card ${plan.id === 'pro' ? 'popular' : ''} ${plan.id === 'plus' ? 'plus-card' : ''}`}>
            {plan.badge && <div className="plan-badge" style={plan.badgeColor ? { background: plan.badgeColor } : {}}>{plan.badge}</div>}
            <h2 className="plan-name">{plan.name}</h2>
            <div className="plan-price">
              <span className="price-amount">{plan.price}</span>
              <span className="price-sub">{plan.priceSub}</span>
            </div>
            {plan.id === 'pro' && spotsLeft !== null && spotsLeft > 0 && (
              <div className="plan-founding">🎉 Free for founding members — {spotsLeft} spots left</div>
            )}
            <button
              className={`plan-cta ${plan.ctaStyle}`}
              onClick={() => handlePlanClick(plan.id)}
              disabled={upgrading === plan.id}
            >
              {upgrading === plan.id ? 'Processing...' :
               plan.id === 'pro' && spotsLeft !== null && spotsLeft > 0 ? 'Claim Free Pro' :
               plan.cta}
            </button>
            <ul className="plan-features">
              {plan.features.map((f) => (
                <li key={f.text} className={f.included ? 'included' : 'excluded'}>
                  <span className="feature-icon">{f.included ? '✓' : '—'}</span>
                  {f.text}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="comparison-section">
        <h2>Full Feature Comparison</h2>
        <div className="comparison-table-wrap">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Basic</th>
                <th className="highlight-col">Pro</th>
                <th>Plus</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.feature}>
                  <td className="feature-name">{row.feature}</td>
                  {(['basic', 'pro', 'plus'] as const).map((p) => {
                    const val = row[p];
                    return (
                      <td key={p} className={p === 'pro' ? 'highlight-col' : ''}>
                        {val === true ? <span className="check">✓</span> :
                         val === false ? <span className="cross">—</span> :
                         <span className="text-val">{val}</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="faq-section">
        <h2>Frequently Asked Questions</h2>
        <div className="faq-list">
          {FAQ.map((item, i) => (
            <div key={i} className={`faq-item ${openFaq === i ? 'open' : ''}`}>
              <button className="faq-question" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                {item.q}
                <span className="faq-toggle">{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && <div className="faq-answer">{item.a}</div>}
            </div>
          ))}
        </div>
      </section>

      <section className="pricing-footer-cta">
        <h2>Ready to get discovered?</h2>
        <p>Start with a free Basic listing. Upgrade anytime.</p>
        <Link href="/register" className="footer-cta-btn">List Your Business — Free</Link>
      </section>

      <footer className="pricing-footer">
        <span>Yana Nagaland</span>
        <span>&copy; 2026 · Made with pride for Nagaland</span>
      </footer>
    </main>
  );
}

const styles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .pricing-page {
    background: #0a0a0a;
    color: #e0e0e0;
    font-family: 'Sora', sans-serif;
    min-height: 100vh;
  }

  /* Nav */
  .pricing-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 clamp(16px, 4vw, 48px);
    height: 64px;
    background: rgba(10, 10, 10, 0.95);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid #1e1e1e;
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .nav-logo {
    display: flex;
    align-items: center;
    gap: 8px;
    text-decoration: none;
    line-height: 1;
  }
  .nav-logo-text { display: flex; flex-direction: column; }
  .nav-logo-name { font-family: 'Playfair Display', serif; font-size: 1.4rem; font-weight: 700; color: #fff; }
  .nav-logo-sub { font-family: 'Sora', sans-serif; font-size: 0.55rem; letter-spacing: 0.35em; color: #888; text-transform: uppercase; margin-top: 1px; }
  .nav-cta {
    background: #c0392b;
    color: #fff;
    text-decoration: none;
    padding: 8px 20px;
    font-size: 0.82rem;
    font-weight: 600;
    border-radius: 6px;
    transition: background 0.2s;
  }
  .nav-cta:hover { background: #e74c3c; }

  /* Hero */
  .pricing-hero {
    text-align: center;
    padding: 80px 20px 40px;
  }
  .pricing-hero h1 {
    font-family: 'Playfair Display', serif;
    font-size: clamp(2rem, 5vw, 3.2rem);
    font-weight: 700;
    color: #fff;
    margin-bottom: 16px;
  }
  .pricing-hero p {
    color: #888;
    font-size: 1rem;
    max-width: 560px;
    margin: 0 auto;
    line-height: 1.7;
  }

  /* Founding Member Banner */
  .founding-banner {
    max-width: 700px;
    margin: 0 auto 32px;
    padding: 24px 28px;
    background: linear-gradient(135deg, rgba(192,57,43,0.08), rgba(212,160,23,0.06));
    border: 1px solid rgba(192,57,43,0.25);
    border-radius: 16px;
    text-align: center;
  }
  .founding-banner.closed {
    background: rgba(255,255,255,0.02);
    border-color: #333;
  }
  .founding-icon { font-size: 2rem; margin-bottom: 8px; }
  .founding-text strong {
    display: block;
    font-size: 1.1rem;
    color: #fff;
    margin-bottom: 6px;
  }
  .founding-text p {
    font-size: 0.88rem;
    color: #999;
    margin-bottom: 16px;
  }
  .founding-banner.closed .founding-text p { margin-bottom: 0; }
  .counter-bar {
    width: 100%;
    height: 8px;
    background: #222;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 8px;
  }
  .counter-fill {
    height: 100%;
    background: linear-gradient(90deg, #c0392b, #D4A017);
    border-radius: 8px;
    transition: width 0.6s ease;
  }
  .counter-text {
    font-size: 0.85rem;
    color: #aaa;
  }
  .counter-spots {
    font-weight: 700;
    color: #4ade80;
    font-size: 1.1rem;
  }

  /* Message */
  .pricing-msg {
    max-width: 600px;
    margin: 0 auto 24px;
    padding: 12px 20px;
    background: rgba(74,222,128,0.08);
    border: 1px solid rgba(74,222,128,0.2);
    border-radius: 10px;
    text-align: center;
    font-size: 0.9rem;
    color: #4ade80;
  }

  /* Plans Grid */
  .plans-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 20px 80px;
    align-items: start;
  }
  .plan-card {
    background: #141414;
    border: 1px solid #222;
    border-radius: 16px;
    padding: 32px 28px;
    position: relative;
    transition: transform 0.2s, border-color 0.2s;
  }
  .plan-card:hover {
    transform: translateY(-4px);
    border-color: #333;
  }
  .plan-card.popular {
    border-color: #c0392b;
    background: linear-gradient(180deg, #1a0f0f, #141414);
  }
  .plan-card.plus-card {
    border-color: #D4A017;
    background: linear-gradient(180deg, #1a1508, #141414);
  }
  .plan-badge {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    background: #c0392b;
    color: #fff;
    font-size: 0.72rem;
    font-weight: 700;
    padding: 4px 16px;
    border-radius: 20px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    white-space: nowrap;
  }
  .plan-name {
    font-family: 'Playfair Display', serif;
    font-size: 1.4rem;
    color: #fff;
    margin-bottom: 12px;
  }
  .plan-price {
    margin-bottom: 4px;
    display: flex;
    align-items: baseline;
    gap: 4px;
  }
  .price-amount {
    font-size: 2.2rem;
    font-weight: 700;
    color: #fff;
  }
  .price-sub {
    font-size: 0.9rem;
    color: #666;
  }
  .plan-founding {
    font-size: 0.78rem;
    color: #4ade80;
    margin-bottom: 12px;
    margin-top: 4px;
    font-weight: 600;
  }
  .plan-cta {
    display: block;
    width: 100%;
    text-align: center;
    padding: 12px;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 700;
    text-decoration: none;
    margin: 16px 0 24px;
    transition: opacity 0.2s, transform 0.15s;
    border: none;
    cursor: pointer;
    font-family: 'Sora', sans-serif;
  }
  .plan-cta:hover:not(:disabled) { transform: translateY(-1px); }
  .plan-cta:disabled { opacity: 0.5; cursor: not-allowed; }
  .cta-basic { background: #222; color: #fff; border: 1px solid #333; }
  .cta-pro { background: #c0392b; color: #fff; box-shadow: 0 4px 14px rgba(192,57,43,0.3); }
  .cta-plus { background: linear-gradient(135deg, #D4A017, #8B6914); color: #fff; box-shadow: 0 4px 14px rgba(212,160,23,0.3); }
  .plan-features { list-style: none; }
  .plan-features li {
    font-size: 0.84rem;
    padding: 8px 0;
    border-bottom: 1px solid #1a1a1a;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .plan-features li:last-child { border-bottom: none; }
  .plan-features li.included { color: #ccc; }
  .plan-features li.excluded { color: #444; }
  .feature-icon { font-size: 0.85rem; width: 18px; flex-shrink: 0; }
  .plan-features li.included .feature-icon { color: #4ade80; }
  .plan-features li.excluded .feature-icon { color: #333; }

  /* Comparison table */
  .comparison-section {
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 20px 80px;
  }
  .comparison-section h2 {
    font-family: 'Playfair Display', serif;
    font-size: 1.8rem;
    color: #fff;
    text-align: center;
    margin-bottom: 32px;
  }
  .comparison-table-wrap {
    overflow-x: auto;
    border-radius: 12px;
    border: 1px solid #222;
  }
  .comparison-table {
    width: 100%;
    border-collapse: collapse;
    background: #111;
  }
  .comparison-table th {
    padding: 16px 20px;
    font-size: 0.85rem;
    font-weight: 700;
    color: #fff;
    text-align: center;
    border-bottom: 1px solid #222;
    background: #0d0d0d;
  }
  .comparison-table th:first-child { text-align: left; }
  .comparison-table td {
    padding: 12px 20px;
    font-size: 0.84rem;
    text-align: center;
    border-bottom: 1px solid #1a1a1a;
    color: #999;
  }
  .comparison-table td:first-child { text-align: left; color: #ccc; }
  .comparison-table .highlight-col { background: rgba(192, 57, 43, 0.05); }
  .comparison-table .check { color: #4ade80; font-weight: 700; }
  .comparison-table .cross { color: #333; }
  .comparison-table .text-val { color: #ccc; font-weight: 500; }
  .feature-name { white-space: nowrap; }

  /* FAQ */
  .faq-section {
    max-width: 700px;
    margin: 0 auto;
    padding: 0 20px 80px;
  }
  .faq-section h2 {
    font-family: 'Playfair Display', serif;
    font-size: 1.8rem;
    color: #fff;
    text-align: center;
    margin-bottom: 32px;
  }
  .faq-item {
    border: 1px solid #222;
    border-radius: 10px;
    margin-bottom: 10px;
    overflow: hidden;
    background: #111;
  }
  .faq-question {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    background: transparent;
    border: none;
    color: #ddd;
    font-family: 'Sora', sans-serif;
    font-size: 0.92rem;
    font-weight: 500;
    cursor: pointer;
    text-align: left;
  }
  .faq-toggle { font-size: 1.2rem; color: #c0392b; flex-shrink: 0; margin-left: 12px; }
  .faq-answer {
    padding: 0 20px 16px;
    color: #888;
    font-size: 0.88rem;
    line-height: 1.7;
  }

  /* Footer CTA */
  .pricing-footer-cta {
    text-align: center;
    padding: 60px 20px 80px;
    background: linear-gradient(180deg, #0a0a0a, #111);
    border-top: 1px solid #1a1a1a;
  }
  .pricing-footer-cta h2 {
    font-family: 'Playfair Display', serif;
    font-size: 1.8rem;
    color: #fff;
    margin-bottom: 10px;
  }
  .pricing-footer-cta p { color: #888; margin-bottom: 24px; }
  .footer-cta-btn {
    display: inline-block;
    background: #c0392b;
    color: #fff;
    text-decoration: none;
    padding: 14px 36px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 0.95rem;
    transition: background 0.2s, transform 0.15s;
  }
  .footer-cta-btn:hover { background: #e74c3c; transform: translateY(-2px); }

  /* Footer */
  .pricing-footer {
    padding: 28px clamp(20px, 4vw, 48px);
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-top: 1px solid #1a1a1a;
    color: #555;
    font-size: 0.78rem;
  }
  .pricing-footer span:first-child { font-family: 'Playfair Display', serif; color: #fff; font-size: 0.95rem; }

  @media (max-width: 800px) {
    .plans-grid { grid-template-columns: 1fr; max-width: 420px; }
    .plan-card.popular { order: -1; }
    .comparison-table { font-size: 0.8rem; }
    .comparison-table th, .comparison-table td { padding: 10px 12px; }
  }
`;

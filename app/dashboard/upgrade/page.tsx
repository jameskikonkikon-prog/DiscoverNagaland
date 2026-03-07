'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

type Business = {
  id: string;
  name: string;
  plan: string;
  trial_ends_at?: string;
  plan_expires_at?: string;
};

const PLAN_DATA = [
  {
    id: 'basic',
    name: 'Basic',
    price: 'Free',
    priceSub: 'Forever',
    badge: null,
    trial: null,
    features: [
      'Full listing with all details',
      '2 photos, no videos',
      'WhatsApp & Call buttons',
      'Normal search position',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₹299',
    priceSub: '/month',
    badge: 'Most Popular',
    trial: '30 days free trial',
    features: [
      'Everything in Basic',
      '10 photos, 3 videos',
      'AI description writer',
      'AI menu/price reader',
      'Analytics & health score',
      'Higher search ranking',
    ],
  },
  {
    id: 'plus',
    name: 'Plus',
    price: '₹499',
    priceSub: '/month',
    badge: null,
    trial: null,
    features: [
      'Everything in Pro',
      'Unlimited photos & videos',
      'Verified Owner badge',
      'Always first in search',
      'Featured on homepage',
      'Vacancy alerts & QR code',
      'Monthly performance report',
    ],
  },
];

function UpgradeInner() {
  const searchParams = useSearchParams();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Preload Razorpay script immediately
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      setScriptLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => setScriptLoaded(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }
      const { data } = await supabase.from('businesses').select('*').eq('owner_id', user.id).single();
      if (!data) { window.location.href = '/register'; return; }
      setBusiness(data);
    };
    load();
  }, []);

  const handleUpgrade = useCallback(async (plan: string) => {
    if (!business || plan === 'basic' || loading) return;
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: business.id, plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create order');

      // Pro trial activation (no payment needed)
      if (data.trial) {
        setMessage('Pro trial activated! Redirecting...');
        setTimeout(() => { window.location.href = '/dashboard?success=upgraded'; }, 1200);
        return;
      }

      if (!window.Razorpay) {
        throw new Error('Payment system loading. Please try again in a moment.');
      }

      // Open Razorpay checkout immediately
      const rzp = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: data.order.amount,
        currency: 'INR',
        order_id: data.order.id,
        name: 'Yana Nagaland',
        description: data.description || `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan - Monthly`,
        theme: { color: '#c0392b' },
        handler: async (response: Record<string, string>) => {
          setMessage('Verifying payment...');
          await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...response, businessId: business.id, plan }),
          });
          window.location.href = '/dashboard?success=upgraded';
        },
        modal: {
          ondismiss: () => { setLoading(false); },
        },
      });
      rzp.open();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Payment failed. Please try again.');
      setLoading(false);
    }
  }, [business, loading]);

  // Auto-trigger upgrade if plan param is in URL (e.g. /dashboard/upgrade?plan=pro)
  useEffect(() => {
    const autoPlan = searchParams.get('plan');
    if (autoPlan && ['pro', 'plus'].includes(autoPlan) && business && scriptLoaded && !loading) {
      handleUpgrade(autoPlan);
    }
  // only run once when business and script are ready
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business, scriptLoaded]);

  const handleCancel = async () => {
    if (!business || business.plan === 'basic') return;
    if (!confirm('Cancel your subscription? You\'ll keep access until the end of your billing period, then downgrade to Basic (free).')) return;

    setLoading(true);
    await supabase
      .from('businesses')
      .update({ plan: 'basic', plan_expires_at: null, trial_ends_at: null, is_verified: false })
      .eq('id', business.id);
    setMessage('Subscription cancelled. Downgraded to Basic.');
    setBusiness({ ...business, plan: 'basic' });
    setLoading(false);
  };

  const currentPlan = business?.plan || 'basic';
  const planOrder = ['basic', 'pro', 'plus'];
  const currentIndex = planOrder.indexOf(currentPlan);

  const nextBillingDate = business?.plan_expires_at
    ? new Date(business.plan_expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <main className="upgrade-page">
      <style>{styles}</style>

      <nav className="upgrade-nav">
        <Link href="/dashboard" className="back-link">← Back to Dashboard</Link>
      </nav>

      <div className="upgrade-content">
        <h1>Choose Your Plan</h1>
        <p className="upgrade-sub">Every plan includes full business listing with all data fields. Upgrade for more visibility and AI tools.</p>

        {message && <div className="upgrade-msg">{message}</div>}

        {/* Current plan info */}
        {currentPlan !== 'basic' && nextBillingDate && (
          <div className="current-plan-info">
            Current: <strong>{currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}</strong> · Next billing: {nextBillingDate}
            <button className="cancel-link" onClick={handleCancel} disabled={loading}>Cancel subscription</button>
          </div>
        )}

        <div className="plans-grid">
          {PLAN_DATA.map((plan) => {
            const isCurrentPlan = currentPlan === plan.id;
            const isDowngrade = planOrder.indexOf(plan.id) < currentIndex;
            const isUpgrade = planOrder.indexOf(plan.id) > currentIndex;
            const isProToPlus = currentPlan === 'pro' && plan.id === 'plus';

            return (
              <div key={plan.id} className={`plan-card ${plan.id === 'pro' ? 'popular' : ''} ${isCurrentPlan ? 'current' : ''}`}>
                {plan.badge && <div className="plan-badge">{plan.badge}</div>}
                {isCurrentPlan && <div className="current-badge">Current Plan</div>}
                <h2>{plan.name}</h2>
                <div className="plan-price">
                  <span className="amount">{plan.price}</span>
                  <span className="sub">{plan.priceSub}</span>
                </div>
                {plan.trial && !business?.trial_ends_at && isUpgrade && <div className="plan-trial">{plan.trial}</div>}
                <button
                  className={`plan-cta ${plan.id}`}
                  disabled={loading || isCurrentPlan || isDowngrade}
                  onClick={() => handleUpgrade(plan.id)}
                >
                  {isCurrentPlan ? 'Current Plan' :
                   isDowngrade ? 'Downgrade' :
                   loading ? 'Processing...' :
                   isProToPlus ? 'Upgrade to Plus — Pay Difference' :
                   isUpgrade && plan.id === 'pro' && !business?.trial_ends_at ? 'Start Free Trial' :
                   plan.id === 'basic' ? 'Free Forever' :
                   `Upgrade to ${plan.name}`}
                </button>
                <ul className="features">
                  {plan.features.map((f) => (
                    <li key={f}><span className="check">✓</span>{f}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="upgrade-note">
          <p>All plans include: name, phone, address, category, price range, amenities, gender, vacancy, WiFi, AC, meals, room type, cuisine, opening hours, vibe tags, and description. <strong>Data entry is never restricted.</strong></p>
        </div>
      </div>
    </main>
  );
}

export default function UpgradePage() {
  return (
    <Suspense fallback={<div style={{ background: '#0a0a0a', minHeight: '100vh' }} />}>
      <UpgradeInner />
    </Suspense>
  );
}

const styles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0a0a0a; }

  .upgrade-page {
    min-height: 100vh;
    background: #0a0a0a;
    color: #e0e0e0;
    font-family: 'Sora', sans-serif;
  }
  .upgrade-nav {
    padding: 16px clamp(16px, 4vw, 48px);
    border-bottom: 1px solid #1e1e1e;
  }
  .back-link {
    color: #c0392b;
    text-decoration: none;
    font-size: 0.85rem;
    font-weight: 500;
  }
  .back-link:hover { text-decoration: underline; }

  .upgrade-content {
    max-width: 1100px;
    margin: 0 auto;
    padding: 48px 20px 80px;
    text-align: center;
  }
  .upgrade-content h1 {
    font-family: 'Playfair Display', serif;
    font-size: 2.2rem;
    color: #fff;
    margin-bottom: 10px;
  }
  .upgrade-sub {
    color: #888;
    font-size: 0.95rem;
    margin-bottom: 32px;
    max-width: 500px;
    margin-left: auto;
    margin-right: auto;
  }
  .upgrade-msg {
    background: rgba(74, 222, 128, 0.1);
    border: 1px solid rgba(74, 222, 128, 0.2);
    color: #4ade80;
    padding: 12px 20px;
    border-radius: 10px;
    font-size: 0.9rem;
    margin-bottom: 24px;
    display: inline-block;
  }
  .current-plan-info {
    background: #141414;
    border: 1px solid #222;
    border-radius: 10px;
    padding: 14px 20px;
    font-size: 0.88rem;
    color: #aaa;
    margin-bottom: 28px;
    display: inline-flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    justify-content: center;
  }
  .cancel-link {
    background: none;
    border: none;
    color: #f87171;
    font-family: 'Sora', sans-serif;
    font-size: 0.82rem;
    cursor: pointer;
    text-decoration: underline;
  }
  .cancel-link:disabled { opacity: 0.5; cursor: not-allowed; }

  .plans-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    margin-bottom: 40px;
    text-align: left;
  }
  .plan-card {
    background: #141414;
    border: 1px solid #222;
    border-radius: 16px;
    padding: 28px 24px;
    position: relative;
    transition: transform 0.2s, border-color 0.2s;
  }
  .plan-card:hover { transform: translateY(-3px); border-color: #333; }
  .plan-card.popular { border-color: #c0392b; background: linear-gradient(180deg, #1a0f0f, #141414); }
  .plan-card.current { border-color: #4ade80; }
  .plan-badge {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    background: #c0392b;
    color: #fff;
    font-size: 0.7rem;
    font-weight: 700;
    padding: 4px 14px;
    border-radius: 20px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    white-space: nowrap;
  }
  .current-badge {
    position: absolute;
    top: -12px;
    right: 16px;
    background: #4ade80;
    color: #000;
    font-size: 0.7rem;
    font-weight: 700;
    padding: 4px 12px;
    border-radius: 20px;
    text-transform: uppercase;
  }
  .plan-card h2 {
    font-family: 'Playfair Display', serif;
    font-size: 1.3rem;
    color: #fff;
    margin-bottom: 10px;
  }
  .plan-price { display: flex; align-items: baseline; gap: 4px; margin-bottom: 4px; }
  .plan-price .amount { font-size: 2rem; font-weight: 700; color: #fff; }
  .plan-price .sub { color: #666; font-size: 0.88rem; }
  .plan-trial { font-size: 0.78rem; color: #4ade80; margin-bottom: 12px; }
  .plan-cta {
    width: 100%;
    padding: 12px;
    border-radius: 8px;
    border: none;
    font-family: 'Sora', sans-serif;
    font-size: 0.88rem;
    font-weight: 700;
    cursor: pointer;
    margin: 14px 0 20px;
    transition: opacity 0.2s, transform 0.15s;
  }
  .plan-cta:hover:not(:disabled) { transform: translateY(-1px); }
  .plan-cta:disabled { opacity: 0.5; cursor: not-allowed; }
  .plan-cta.basic { background: #222; color: #888; }
  .plan-cta.pro { background: #c0392b; color: #fff; box-shadow: 0 4px 14px rgba(192,57,43,0.3); }
  .plan-cta.plus { background: linear-gradient(135deg, #c0392b, #8B0000); color: #fff; box-shadow: 0 4px 14px rgba(139,0,0,0.3); }
  .features { list-style: none; }
  .features li {
    font-size: 0.82rem;
    color: #bbb;
    padding: 6px 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .features .check { color: #4ade80; font-weight: 700; }

  .upgrade-note {
    background: #111;
    border: 1px solid #1e1e1e;
    border-radius: 10px;
    padding: 16px 24px;
    text-align: center;
  }
  .upgrade-note p { color: #888; font-size: 0.85rem; line-height: 1.6; }
  .upgrade-note strong { color: #ccc; }

  @media (max-width: 800px) {
    .plans-grid { grid-template-columns: 1fr; max-width: 400px; margin-left: auto; margin-right: auto; }
    .plan-card.popular { order: -1; }
  }
`;

'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Suspense } from 'react';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    yearlyPrice: 0,
    color: '#6a7a6a',
    features: ['Name & address listed', 'Phone number visible', 'Basic category listing', 'Limited search visibility'],
    missing: ['Photos', 'WhatsApp button', 'Description', 'AI search results', 'Analytics'],
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 299,
    yearlyPrice: 2990,
    yearlySavings: 598,
    recommended: true,
    color: '#c9963a',
    features: ['Everything in Free', 'Photos visible', 'WhatsApp button', 'Description & hours', 'Custom fields', 'AI search results', 'Full profile visible'],
    missing: ['Verified badge', 'Priority ranking', 'Analytics dashboard'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 499,
    yearlyPrice: 4990,
    yearlySavings: 998,
    color: '#e8ddd0',
    features: ['Everything in Basic', '✓ Verified badge', 'Priority in search', 'Analytics dashboard', 'Featured on category pages', 'Always above Basic & Free'],
    missing: [],
  },
];

function UpgradeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [biz, setBiz] = useState<{ id: string; name: string; plan: string } | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const success = searchParams.get('success');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('businesses').select('id,name,plan').eq('owner_id', user.id).single();
      if (data) setBiz(data);
    }
    load();
  }, []);

  async function handleUpgrade(planId: string) {
    if (planId === 'free' || !biz) return;
    setLoading(planId);
    try {
      const plan = PLANS.find(p => p.id === planId)!;
      const amount = billing === 'yearly' ? plan.yearlyPrice! * 100 : plan.price * 100;
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: biz.id, plan: planId, billing, amount }),
      });
      const { orderId, keyId } = await res.json();
      const rzp = new (window as unknown as { Razorpay: new (opts: unknown) => { open: () => void } }).Razorpay({
        key: keyId,
        amount,
        currency: 'INR',
        name: 'Discover Nagaland',
        description: `${plan.name} Plan — ${billing}`,
        order_id: orderId,
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...response, businessId: biz.id, plan: planId, billing }),
          });
          router.push('/dashboard?success=upgraded');
        },
        prefill: { name: biz.name },
        theme: { color: '#c9963a' },
      });
      rzp.open();
    } catch (e) {
      console.error(e);
    }
    setLoading(null);
  }

  return (
    <>
      <style>{styles}</style>
      <main className="upgrade-page">
        <nav className="upgrade-nav">
          <a href="/" className="nav-logo">Discover<span>Nagaland</span></a>
          <a href="/dashboard" className="nav-back">← Dashboard</a>
        </nav>

        {success && (
          <div className="success-banner">🎉 You&apos;re now on the upgraded plan! Your listing is now fully visible.</div>
        )}

        <div className="upgrade-hero">
          <h1>Choose Your <em>Plan</em></h1>
          <p>Get found by more customers across Nagaland</p>
          <div className="billing-toggle">
            <button className={`toggle-btn ${billing === 'monthly' ? 'active' : ''}`} onClick={() => setBilling('monthly')}>Monthly</button>
            <button className={`toggle-btn ${billing === 'yearly' ? 'active' : ''}`} onClick={() => setBilling('yearly')}>
              Yearly <span className="save-badge">Save up to ₹998</span>
            </button>
          </div>
        </div>

        <div className="plans-grid">
          {PLANS.map(plan => {
            const price = billing === 'yearly' && plan.yearlyPrice ? plan.yearlyPrice : plan.price;
            const isCurrent = biz?.plan === plan.id;
            return (
              <div key={plan.id} className={`plan-card ${plan.recommended ? 'recommended' : ''} ${isCurrent ? 'current' : ''}`}>
                {plan.recommended && <div className="recommended-badge">Most Popular</div>}
                {isCurrent && <div className="current-badge">Current Plan</div>}
                <div className="plan-name" style={{ color: plan.color }}>{plan.name}</div>
                <div className="plan-price">
                  {price === 0 ? <span>Free</span> : <><span className="price-rs">₹</span>{price.toLocaleString()}<span className="price-period">/{billing === 'yearly' ? 'year' : 'mo'}</span></>}
                </div>
                {billing === 'yearly' && plan.yearlySavings && (
                  <div className="yearly-savings">Save ₹{plan.yearlySavings} vs monthly</div>
                )}
                <div className="plan-features">
                  {plan.features.map(f => <div key={f} className="feature-item">✓ {f}</div>)}
                  {plan.missing.map(f => <div key={f} className="feature-item missing">✗ {f}</div>)}
                </div>
                <button
                  className={`plan-btn ${plan.id === 'free' ? 'free-btn' : plan.recommended ? 'recommended-btn' : 'pro-btn'}`}
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={plan.id === 'free' || isCurrent || loading === plan.id}
                >
                  {loading === plan.id ? 'Opening payment…' : isCurrent ? 'Current Plan' : plan.id === 'free' ? 'Free Forever' : `Upgrade to ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>

        <div className="upgrade-footer">
          <p>🔒 Secure payment via Razorpay · UPI, Cards, Net Banking accepted</p>
          <p>Your listing stays live forever — even on free plan</p>
        </div>
      </main>
    </>
  );
}

export default function UpgradePage() {
  return (
    <Suspense fallback={<div style={{ background: '#0d1a0d', minHeight: '100vh' }} />}>
      <UpgradeInner />
    </Suspense>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Outfit:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0d1a0d; color: #e8ddd0; font-family: 'Outfit', sans-serif; }
  .upgrade-page { min-height: 100vh; background: #0d1a0d; padding-bottom: 4rem; }
  .upgrade-nav { display: flex; align-items: center; justify-content: space-between; padding: 1rem 2rem; border-bottom: 1px solid rgba(201,150,58,0.1); }
  .nav-logo { font-family: 'Playfair Display', serif; font-size: 1.2rem; color: #c9963a; text-decoration: none; }
  .nav-logo span { color: #e8ddd0; }
  .nav-back { color: #8a9a8a; text-decoration: none; font-size: 0.85rem; }
  .nav-back:hover { color: #c9963a; }
  .success-banner { background: rgba(74,222,128,0.1); border: 1px solid rgba(74,222,128,0.2); color: #4ade80; padding: 1rem 2rem; text-align: center; font-size: 0.95rem; }
  .upgrade-hero { text-align: center; padding: 3rem 2rem 2rem; }
  .upgrade-hero h1 { font-family: 'Playfair Display', serif; font-size: clamp(1.8rem, 4vw, 2.8rem); color: #e8ddd0; margin-bottom: 0.5rem; }
  .upgrade-hero h1 em { color: #c9963a; font-style: italic; }
  .upgrade-hero p { color: #8a9a8a; margin-bottom: 1.5rem; }
  .billing-toggle { display: inline-flex; background: rgba(255,255,255,0.04); border: 1px solid rgba(201,150,58,0.15); border-radius: 10px; padding: 4px; gap: 4px; }
  .toggle-btn { padding: 0.5rem 1.25rem; border: none; border-radius: 8px; font-family: 'Outfit', sans-serif; font-size: 0.88rem; cursor: pointer; background: transparent; color: #8a9a8a; transition: all 0.2s; display: flex; align-items: center; gap: 0.5rem; }
  .toggle-btn.active { background: #c9963a; color: #000d00; font-weight: 600; }
  .save-badge { background: rgba(74,222,128,0.15); color: #4ade80; font-size: 0.7rem; padding: 0.15rem 0.5rem; border-radius: 10px; }
  .plans-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; max-width: 1000px; margin: 0 auto; padding: 0 1.5rem; }
  .plan-card { background: linear-gradient(145deg, #1a2e1a, #152515); border: 1px solid rgba(201,150,58,0.12); border-radius: 18px; padding: 2rem 1.5rem; position: relative; display: flex; flex-direction: column; gap: 0; }
  .plan-card.recommended { border-color: #c9963a; box-shadow: 0 0 40px rgba(201,150,58,0.15); transform: scale(1.03); }
  .recommended-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #c9963a; color: #000d00; font-size: 0.72rem; font-weight: 700; padding: 0.25rem 0.85rem; border-radius: 20px; white-space: nowrap; }
  .current-badge { position: absolute; top: -12px; right: 1rem; background: rgba(74,222,128,0.2); color: #4ade80; border: 1px solid rgba(74,222,128,0.3); font-size: 0.72rem; padding: 0.25rem 0.7rem; border-radius: 20px; }
  .plan-name { font-size: 0.78rem; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 600; margin-bottom: 0.75rem; }
  .plan-price { font-family: 'Playfair Display', serif; font-size: 2.2rem; color: #e8ddd0; margin-bottom: 0.25rem; line-height: 1; }
  .price-rs { font-size: 1.2rem; }
  .price-period { font-family: 'Outfit', sans-serif; font-size: 0.85rem; color: #8a9a8a; }
  .yearly-savings { font-size: 0.75rem; color: #4ade80; margin-bottom: 1.25rem; }
  .plan-features { flex: 1; margin: 1.25rem 0; display: flex; flex-direction: column; gap: 0.5rem; }
  .feature-item { font-size: 0.82rem; color: rgba(232,221,208,0.8); line-height: 1.4; }
  .feature-item.missing { color: #4a5a4a; }
  .plan-btn { width: 100%; padding: 0.85rem; border-radius: 10px; font-family: 'Outfit', sans-serif; font-size: 0.92rem; font-weight: 700; cursor: pointer; border: none; margin-top: 1rem; transition: opacity 0.2s, transform 0.15s; }
  .plan-btn:hover:not(:disabled) { transform: translateY(-1px); }
  .plan-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .free-btn { background: rgba(255,255,255,0.06); color: #6a7a6a; border: 1px solid rgba(255,255,255,0.08); }
  .recommended-btn { background: linear-gradient(135deg, #c9963a, #a07020); color: #000d00; }
  .pro-btn { background: rgba(232,221,208,0.1); color: #e8ddd0; border: 1px solid rgba(232,221,208,0.2); }
  .upgrade-footer { text-align: center; margin-top: 2.5rem; color: #6a7a6a; font-size: 0.82rem; line-height: 2; }
  @media (max-width: 768px) {
    .plans-grid { grid-template-columns: 1fr; max-width: 420px; }
    .plan-card.recommended { transform: none; }
  }
`;

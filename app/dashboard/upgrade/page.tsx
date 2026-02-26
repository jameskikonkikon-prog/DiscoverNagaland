'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PLANS, Business } from '@/types';

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export default function UpgradePage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(false);

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

  const handleUpgrade = async (plan: 'basic' | 'pro') => {
    if (!business) return;
    setLoading(true);

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: business.id, plan }),
      });
      const { order } = await res.json();

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      document.body.appendChild(script);

      script.onload = () => {
        const rzp = new window.Razorpay({
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: order.amount,
          currency: 'INR',
          order_id: order.id,
          name: 'Discover Nagaland',
          description: `${plan.toUpperCase()} Plan - 1 Month`,
          handler: async (response: Record<string, string>) => {
            await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...response, businessId: business.id, plan }),
            });
            window.location.href = '/dashboard?upgraded=1';
          },
        });
        rzp.open();
      };
    } catch {
      alert('Payment failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <a href="/dashboard" className="text-orange-600 hover:underline text-sm mb-6 block">← Back to Dashboard</a>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Upgrade Your Plan</h1>
        <p className="text-gray-600 mb-8">Get more visibility and features for your business</p>

        <div className="grid md:grid-cols-2 gap-6">
          {(['basic', 'pro'] as const).map((plan) => (
            <div key={plan} className={`bg-white rounded-2xl p-6 shadow-sm border-2 ${plan === 'pro' ? 'border-orange-500' : 'border-gray-200'}`}>
              {plan === 'pro' && <div className="text-orange-600 text-sm font-bold mb-2">⭐ MOST POPULAR</div>}
              <h2 className="text-2xl font-bold text-gray-900 capitalize">{plan}</h2>
              <p className="text-3xl font-bold text-orange-600 my-3">₹{PLANS[plan].price}<span className="text-base text-gray-500 font-normal">/month</span></p>
              <ul className="space-y-2 mb-6">
                {PLANS[plan].features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-gray-700">
                    <span className="text-green-500">✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleUpgrade(plan)}
                disabled={loading || business?.plan === plan}
                className={`w-full py-3 rounded-xl font-semibold transition ${
                  business?.plan === plan
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-orange-600 text-white hover:bg-orange-700'
                }`}
              >
                {business?.plan === plan ? 'Current Plan' : loading ? 'Processing...' : `Upgrade to ${plan.toUpperCase()}`}
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

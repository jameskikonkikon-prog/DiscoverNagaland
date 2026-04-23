import { NextRequest, NextResponse } from 'next/server';

const FROM = 'Yana Nagaland <hello@yananagaland.com>';
const DASHBOARD_URL = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`;

type EmailPayload = {
  type: 'welcome' | 'trial_ending' | 'trial_ended' | 'payment_success';
  email: string;
  name: string;
  plan?: string;
  billing?: string;
};

function getEmailContent(payload: EmailPayload) {
  const { type, name, plan, billing } = payload;

  if (type === 'welcome') return {
    subject: `🎉 ${name} is now live on Yana Nagaland!`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0d1a0d;color:#e8ddd0;padding:2rem;border-radius:12px;">
        <h1 style="color:#c9963a;font-size:1.6rem;">You're listed! 🎉</h1>
        <p>Hi ${name},</p>
        <p>Your business is now live on Yana Nagaland. Customers across Nagaland can find you!</p>
        <div style="background:rgba(201,150,58,0.1);border:1px solid rgba(201,150,58,0.2);border-radius:8px;padding:1rem;margin:1.5rem 0;">
          <strong style="color:#c9963a;">🎁 30-Day Free Trial Started</strong>
          <p style="margin:0.5rem 0 0;font-size:0.9rem;">You have full Basic features free for 30 days — no credit card needed.</p>
        </div>
        <a href="${DASHBOARD_URL}" style="display:inline-block;background:#c9963a;color:#000;padding:0.85rem 2rem;border-radius:8px;text-decoration:none;font-weight:700;margin-top:1rem;">View Your Dashboard →</a>
      </div>
    `,
  };

  if (type === 'trial_ending') return {
    subject: `⚠️ Your free trial ends in 5 days — keep full visibility`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0d1a0d;color:#e8ddd0;padding:2rem;border-radius:12px;">
        <h1 style="color:#c9963a;font-size:1.6rem;">Trial ending soon</h1>
        <p>Hi ${name},</p>
        <p>Your 30-day free trial ends in <strong>5 days</strong>. After that, your listing moves to the Free plan with limited visibility.</p>
        <p>Upgrade to Basic for just ₹299/month to keep full visibility, photos, WhatsApp button, and AI search results.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/upgrade" style="display:inline-block;background:#c9963a;color:#000;padding:0.85rem 2rem;border-radius:8px;text-decoration:none;font-weight:700;margin-top:1rem;">Upgrade for ₹299/month →</a>
      </div>
    `,
  };

  if (type === 'trial_ended') return {
    subject: `Your free trial has ended — upgrade to stay visible`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0d1a0d;color:#e8ddd0;padding:2rem;border-radius:12px;">
        <h1 style="color:#c9963a;font-size:1.6rem;">Trial ended</h1>
        <p>Hi ${name},</p>
        <p>Your free trial has ended. Your listing is still live but with limited visibility on the Free plan.</p>
        <p>Upgrade to Basic for ₹299/month to get found by more customers — full photos, WhatsApp, and AI search.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/upgrade" style="display:inline-block;background:#c9963a;color:#000;padding:0.85rem 2rem;border-radius:8px;text-decoration:none;font-weight:700;margin-top:1rem;">Upgrade for ₹299/month →</a>
        <p style="font-size:0.82rem;color:#6a7a6a;margin-top:1.5rem;">Your listing stays live forever — even on the free plan.</p>
      </div>
    `,
  };

  if (type === 'payment_success') {
    const planName = plan === 'pro' ? 'Pro' : 'Basic';
    const price = plan === 'pro' ? (billing === 'yearly' ? '₹4,990/year' : '₹499/month') : (billing === 'yearly' ? '₹2,990/year' : '₹299/month');
    return {
      subject: `✅ Payment confirmed — you're now on ${planName}!`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0d1a0d;color:#e8ddd0;padding:2rem;border-radius:12px;">
          <h1 style="color:#c9963a;font-size:1.6rem;">You're on ${planName}! ✅</h1>
          <p>Hi ${name},</p>
          <p>Payment confirmed. Your listing is now on the <strong style="color:#c9963a;">${planName} plan</strong> at ${price}.</p>
          ${plan === 'pro' ? '<p>Your verified badge is now active — you appear above all other listings in search.</p>' : '<p>Your full profile is now visible — photos, WhatsApp button, and AI search results are all active.</p>'}
          <a href="${DASHBOARD_URL}" style="display:inline-block;background:#c9963a;color:#000;padding:0.85rem 2rem;border-radius:8px;text-decoration:none;font-weight:700;margin-top:1rem;">View Your Dashboard →</a>
        </div>
      `,
    };
  }

  return { subject: '', html: '' };
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error('[emails/send] Resend error:', res.status, body);
    throw new Error(`Resend ${res.status}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload: EmailPayload = await req.json();
    const { subject, html } = getEmailContent(payload);
    if (!subject) return NextResponse.json({ error: 'Unknown email type' }, { status: 400 });
    await sendEmail(payload.email, subject, html);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Email error:', err);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}

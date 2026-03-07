export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { PLANS } from '@/types';
import Razorpay from 'razorpay';

export async function POST(request: NextRequest) {
  const { businessId, plan } = await request.json();

  if (!businessId || !plan || !['pro', 'plus'].includes(plan)) {
    return NextResponse.json({ error: 'Invalid request. Plan must be pro or plus.' }, { status: 400 });
  }

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });

  try {
    const serviceClient = getServiceClient();
    const { data: business } = await serviceClient
      .from('businesses')
      .select('trial_ends_at, plan, plan_expires_at')
      .eq('id', businessId)
      .single();

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Pro plan: if no prior trial, start free trial (no payment needed)
    if (plan === 'pro' && !business.trial_ends_at) {
      const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await serviceClient
        .from('businesses')
        .update({
          plan: 'pro',
          trial_ends_at: trialEndsAt,
          plan_expires_at: trialEndsAt,
        })
        .eq('id', businessId);

      return NextResponse.json({ trial: true, trialEndsAt });
    }

    // Calculate amount: differential pricing for Pro → Plus
    let amount = PLANS[plan as 'pro' | 'plus'].priceInPaise;
    let description = `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan - Monthly`;

    if (plan === 'plus' && business.plan === 'pro' && business.plan_expires_at) {
      const expiresAt = new Date(business.plan_expires_at).getTime();
      const now = Date.now();
      const totalPeriod = 30 * 24 * 60 * 60 * 1000;
      const remaining = Math.max(0, expiresAt - now);
      const fractionRemaining = remaining / totalPeriod;

      if (fractionRemaining > 0.01) {
        // Pro credit for unused days
        const proCredit = Math.round(PLANS.pro.priceInPaise * fractionRemaining);
        const plusFull = PLANS.plus.priceInPaise;
        amount = Math.max(plusFull - proCredit, 100); // minimum ₹1
        description = `Plus Plan Upgrade (Pro credit applied)`;
      }
    }

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `order_${businessId}_${plan}_${Date.now()}`,
    });

    await serviceClient.from('payments').insert({
      business_id: businessId,
      razorpay_order_id: order.id,
      amount,
      plan,
      status: 'created',
    });

    return NextResponse.json({ order, amount, description });
  } catch (error) {
    console.error('Razorpay error:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}

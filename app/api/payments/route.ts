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

  const planConfig = PLANS[plan as 'pro' | 'plus'];
  const amount = planConfig.priceInPaise;

  if (amount === 0) {
    return NextResponse.json({ error: 'Cannot create order for free plan' }, { status: 400 });
  }

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });

  try {
    // For Pro plan with trial, check if business already had a trial
    const serviceClient = getServiceClient();
    const { data: business } = await serviceClient
      .from('businesses')
      .select('trial_ends_at, plan')
      .eq('id', businessId)
      .single();

    // Pro plan: if no prior trial, start free trial (no payment needed)
    if (plan === 'pro' && !business?.trial_ends_at) {
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

    // Create Razorpay order for paid subscription
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

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Razorpay error:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}

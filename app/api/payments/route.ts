export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { PLANS, FOUNDING_MEMBER_LIMIT } from '@/types';
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
      .select('plan, plan_expires_at, is_founding_member')
      .eq('id', businessId)
      .single();

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Pro plan: check if eligible for founding member (free Pro)
    if (plan === 'pro') {
      // Already a founding member
      if (business.is_founding_member) {
        return NextResponse.json({ error: 'You already have founding member Pro access.' }, { status: 400 });
      }

      // Check founding member spots
      const { count } = await serviceClient
        .from('businesses')
        .select('*', { count: 'exact', head: true })
        .eq('is_founding_member', true);

      if ((count || 0) < FOUNDING_MEMBER_LIMIT) {
        // Grant free Pro as founding member
        await serviceClient
          .from('businesses')
          .update({
            plan: 'pro',
            is_founding_member: true,
            plan_expires_at: null, // no expiry for founding members
          })
          .eq('id', businessId);

        return NextResponse.json({ foundingMember: true, spotsRemaining: FOUNDING_MEMBER_LIMIT - (count || 0) - 1 });
      }

      // No founding spots left — require payment
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
        const proCredit = Math.round(PLANS.pro.priceInPaise * fractionRemaining);
        const plusFull = PLANS.plus.priceInPaise;
        amount = Math.max(plusFull - proCredit, 100);
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

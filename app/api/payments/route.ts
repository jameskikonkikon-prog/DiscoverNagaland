export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getServiceClient } from '@/lib/supabase';
import { PLANS, FOUNDING_MEMBER_LIMIT } from '@/types';
import Razorpay from 'razorpay';

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { businessId, plan } = await request.json();

  if (!businessId || !plan || !['pro', 'plus'].includes(plan)) {
    return NextResponse.json({ error: 'Invalid request. Plan must be pro or plus.' }, { status: 400 });
  }

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error('Missing Razorpay env vars:', {
      hasKeyId: !!process.env.RAZORPAY_KEY_ID,
      hasKeySecret: !!process.env.RAZORPAY_KEY_SECRET,
    });
    return NextResponse.json({ error: 'Payment service not configured. Please contact support.' }, { status: 500 });
  }

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  try {
    const serviceClient = getServiceClient();
    const { data: business } = await serviceClient
      .from('businesses')
      .select('plan, plan_expires_at, owner_id')
      .eq('id', businessId)
      .single();

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    if (business.owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Pro plan: check if eligible for founding member (free Pro)
    if (plan === 'pro') {
      // Already a founding member (pro with no expiry)
      if (business.plan === 'pro' && !business.plan_expires_at) {
        return NextResponse.json({ error: 'You already have founding member Pro access.' }, { status: 400 });
      }

      // Early Access: first 100 on pro or plus get free Pro
      const { count } = await serviceClient
        .from('businesses')
        .select('*', { count: 'exact', head: true })
        .in('plan', ['pro', 'plus']);

      if ((count || 0) < FOUNDING_MEMBER_LIMIT) {
        // Grant free Pro as founding member
        await serviceClient
          .from('businesses')
          .update({
            plan: 'pro',
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
      receipt: `receipt_${Date.now()}`,
    });

    await serviceClient.from('payments').insert({
      business_id: businessId,
      razorpay_order_id: order.id,
      amount,
      plan,
      status: 'created',
    });

    return NextResponse.json({ order, amount, description, key: process.env.RAZORPAY_KEY_ID });
  } catch (error: unknown) {
    const err = error as Record<string, unknown>;
    const msg =
      (err?.error as { description?: string })?.description ??
      (err?.description as string) ??
      (err?.reason as string) ??
      (error instanceof Error ? error.message : null) ??
      (typeof err === 'object' && err !== null ? JSON.stringify(err) : String(error));
    console.error('Razorpay order creation error:', msg, error);
    return NextResponse.json({ error: `Failed to create order: ${msg}` }, { status: 500 });
  }
}

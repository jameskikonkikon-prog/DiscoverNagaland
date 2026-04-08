export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getServiceClient } from '@/lib/supabase';
import { PLANS } from '@/types';
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

  if (!businessId || plan !== 'pro') {
    return NextResponse.json({ error: 'Invalid request. Only the Pro plan can be purchased.' }, { status: 400 });
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

    if (business.plan === 'pro' && business.plan_expires_at && new Date(business.plan_expires_at) > new Date()) {
      return NextResponse.json({ error: 'You already have an active Pro subscription.' }, { status: 400 });
    }

    const amount = PLANS.pro.priceInPaise;
    const description = 'Pro Plan — ₹499/month';

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

export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import crypto from 'crypto';

// Plan → max listings to upgrade (agent = null means all)
const PLAN_LIMITS: Record<string, number | null> = {
  starter: 1,
  pro: 5,
  agent: null,
};

export async function POST(req: NextRequest) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing payment fields' }, { status: 400 });
    }

    // Verify Razorpay signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest('hex');

    if (expected !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    const serviceClient = getServiceClient();

    // Read user_id and plan from stored payment record — never trust the client
    const { data: payment } = await serviceClient
      .from('payments')
      .select('user_id, plan')
      .eq('razorpay_order_id', razorpay_order_id)
      .eq('payment_type', 're')
      .single();

    if (!payment?.user_id) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    const { user_id, plan } = payment;
    const limit = PLAN_LIMITS[plan] ?? null;

    // Update payment status
    await serviceClient
      .from('payments')
      .update({ razorpay_payment_id, status: 'paid' })
      .eq('razorpay_order_id', razorpay_order_id);

    // Fetch user's properties ordered by created_at (oldest first = most likely to be primary)
    const { data: properties } = await serviceClient
      .from('properties')
      .select('id')
      .eq('owner_id', user_id)
      .order('created_at', { ascending: true });

    const allProps = properties ?? [];
    const toUpgrade = limit === null ? allProps : allProps.slice(0, limit);
    const idsToUpgrade = toUpgrade.map(p => p.id);

    if (idsToUpgrade.length > 0) {
      const planExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await serviceClient
        .from('properties')
        .update({ plan, plan_expires_at: planExpiresAt })
        .in('id', idsToUpgrade);
    }

    return NextResponse.json({ success: true, upgraded: idsToUpgrade.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('RE payment verify error:', msg);
    return NextResponse.json({ error: `Verification failed: ${msg}` }, { status: 500 });
  }
}

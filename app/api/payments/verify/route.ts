export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = await request.json();

  if (!['pro', 'plus'].includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  // Verify signature
  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const serviceClient = getServiceClient();

  // Read business_id from the stored payment record — never from the request body
  const { data: payment } = await serviceClient
    .from('payments')
    .select('business_id')
    .eq('razorpay_order_id', razorpay_order_id)
    .single();

  if (!payment?.business_id) {
    return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
  }

  const storedBusinessId = payment.business_id;

  // Update payment record
  await serviceClient
    .from('payments')
    .update({ razorpay_payment_id, status: 'paid' })
    .eq('razorpay_order_id', razorpay_order_id);

  // Calculate plan expiry (30 days from now)
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // Upgrade business plan using the stored business_id only
  const updateData: Record<string, unknown> = {
    plan,
    plan_expires_at: expiresAt,
    grace_period_ends_at: null,
  };

  // Plus plan gets verified badge
  if (plan === 'plus') {
    updateData.is_verified = true;
  }

  await serviceClient
    .from('businesses')
    .update(updateData)
    .eq('id', storedBusinessId);

  return NextResponse.json({ success: true });
}

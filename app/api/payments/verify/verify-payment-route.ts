
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getServiceClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, businessId, plan, billing } = await req.json();

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest('hex');

    if (expectedSig !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Calculate expiry
    const now = new Date();
    const expiresAt = billing === 'yearly'
      ? new Date(now.setFullYear(now.getFullYear() + 1))
      : new Date(now.setMonth(now.getMonth() + 1));

    // Upgrade the business plan
    await supabase.from('businesses').update({
      plan,
      plan_expires_at: expiresAt.toISOString(),
      is_verified: plan === 'pro',
    }).eq('id', businessId);

    // Update payment record
    await supabase.from('payments').update({
      razorpay_payment_id,
      status: 'paid',
    }).eq('razorpay_order_id', razorpay_order_id);

    // Get business for email
    const { data: biz } = await supabase.from('businesses').select('name, email').eq('id', businessId).single();

    // Send payment success email
    if (biz?.email) {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/emails/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'payment_success',
          email: biz.email,
          name: biz.name,
          plan,
          billing,
        }),
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Verify payment error:', err);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}

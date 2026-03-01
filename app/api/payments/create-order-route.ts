import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { getServiceClient } from '@/lib/supabase';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: NextRequest) {
  try {
    const { businessId, plan, billing, amount } = await req.json();

    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `order_${businessId}_${Date.now()}`,
      notes: { businessId, plan, billing },
    });

    // Save pending payment
    const supabase = getServiceClient();
    await supabase.from('payments').insert({
      business_id: businessId,
      razorpay_order_id: order.id,
      plan,
      billing,
      amount,
      status: 'pending',
    });

    return NextResponse.json({
      orderId: order.id,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('Create order error:', err);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}

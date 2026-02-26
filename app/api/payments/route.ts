import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { PLANS } from '@/types';
import Razorpay from 'razorpay';

export async function POST(request: NextRequest) {
  const { businessId, plan } = await request.json();

  if (!businessId || !plan || !PLANS[plan as keyof typeof PLANS]) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });

  const amount = PLANS[plan as 'basic' | 'pro'].priceInPaise;

  try {
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `order_${businessId}_${Date.now()}`,
    });

    const serviceClient = getServiceClient();
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

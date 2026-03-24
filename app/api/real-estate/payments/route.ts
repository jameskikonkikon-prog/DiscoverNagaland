export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Razorpay from 'razorpay';

const RE_PLANS = {
  starter: { amount: 49900, label: 'Starter Plan — Real Estate' },
  pro:     { amount: 79900, label: 'Pro Plan — Real Estate' },
  agent:   { amount: 149900, label: 'Agent / Broker Plan — Real Estate' },
} as const;

type REPlan = keyof typeof RE_PLANS;

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const cookieStore = await cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { plan } = await req.json();
    if (!plan || !(plan in RE_PLANS)) {
      return NextResponse.json({ error: 'Invalid plan. Must be starter, pro, or agent.' }, { status: 400 });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ error: 'Payment service not configured.' }, { status: 500 });
    }

    const { amount, label } = RE_PLANS[plan as REPlan];

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `re_${Date.now()}`,
    });

    // Store in payments table — requires user_id and payment_type columns (see SQL)
    const serviceClient = getServiceClient();
    await serviceClient.from('payments').insert({
      user_id: user.id,
      razorpay_order_id: order.id,
      amount,
      plan,
      status: 'pending',
      payment_type: 're',
    });

    return NextResponse.json({
      order,
      key: process.env.RAZORPAY_KEY_ID,
      description: label,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('RE payment order error:', msg);
    return NextResponse.json({ error: `Failed to create order: ${msg}` }, { status: 500 });
  }
}

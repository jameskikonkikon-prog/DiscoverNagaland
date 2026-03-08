export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { FOUNDING_MEMBER_LIMIT } from '@/types';

export async function GET() {
  try {
    const serviceClient = getServiceClient();
    const { count } = await serviceClient
      .from('businesses')
      .select('*', { count: 'exact', head: true })
      .eq('plan', 'pro')
      .is('plan_expires_at', null);

    const claimed = count || 0;
    const remaining = Math.max(0, FOUNDING_MEMBER_LIMIT - claimed);

    return NextResponse.json({ claimed, remaining, total: FOUNDING_MEMBER_LIMIT });
  } catch {
    return NextResponse.json({ claimed: 0, remaining: FOUNDING_MEMBER_LIMIT, total: FOUNDING_MEMBER_LIMIT });
  }
}

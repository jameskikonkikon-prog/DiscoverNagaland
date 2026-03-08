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
      .in('plan', ['pro', 'plus']);

    const claimed = count || 0;
    const spotsRemaining = Math.max(0, FOUNDING_MEMBER_LIMIT - claimed);
    const isFull = spotsRemaining === 0;

    return NextResponse.json({
      claimed,
      remaining: spotsRemaining,
      spotsRemaining,
      isFull,
      total: FOUNDING_MEMBER_LIMIT,
    });
  } catch {
    return NextResponse.json({
      claimed: 0,
      remaining: FOUNDING_MEMBER_LIMIT,
      spotsRemaining: FOUNDING_MEMBER_LIMIT,
      isFull: false,
      total: FOUNDING_MEMBER_LIMIT,
    });
  }
}

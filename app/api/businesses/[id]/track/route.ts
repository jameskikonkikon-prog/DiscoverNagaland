export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { event } = await request.json();
  
  try {
    const today = new Date().toISOString().split('T')[0];
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: existing } = await client
      .from('business_analytics')
      .select('*')
      .eq('business_id', params.id)
      .eq('date', today)
      .single();

    if (existing) {
      await client
        .from('business_analytics')
        .update({ [event]: (existing[event] || 0) + 1 })
        .eq('id', existing.id);
    } else {
      await client.from('business_analytics').insert({
        business_id: params.id,
        date: today,
        [event]: 1,
      });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Tracking failed' }, { status: 500 });
  }
}

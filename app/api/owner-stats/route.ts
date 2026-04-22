export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = getServiceClient();
  const businessId = request.nextUrl.searchParams.get('businessId');

  let biz: { id: string; name: string; plan: string } | null = null;

  if (businessId) {
    const { data } = await serviceClient
      .from('businesses')
      .select('id, name, plan')
      .eq('id', businessId)
      .eq('owner_id', user.id)
      .eq('is_active', true)
      .single();
    biz = data;
  } else {
    const { data } = await serviceClient
      .from('businesses')
      .select('id, name, plan')
      .eq('owner_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .single();
    biz = data;
  }

  if (!biz) return NextResponse.json({ error: 'No business found' }, { status: 404 });

  const { data: rows } = await serviceClient
    .from('lead_events')
    .select('event_type')
    .eq('business_id', biz.id);

  const totals = (rows ?? []).reduce(
    (acc, r) => ({
      views:    acc.views    + (r.event_type === 'view'      ? 1 : 0),
      calls:    acc.calls    + (r.event_type === 'call'      ? 1 : 0),
      whatsapp: acc.whatsapp + (r.event_type === 'whatsapp'  ? 1 : 0),
    }),
    { views: 0, calls: 0, whatsapp: 0 }
  );

  return NextResponse.json({ name: biz.name, plan: biz.plan, ...totals });
}

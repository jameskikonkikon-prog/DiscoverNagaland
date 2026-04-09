export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getServiceClient } from '@/lib/supabase';

export async function GET() {
  // Authenticate via cookie session
  const cookieStore = await cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = getServiceClient();

  // Find the owner's active business
  const { data: biz } = await serviceClient
    .from('businesses')
    .select('id, name, plan')
    .eq('owner_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .single();

  if (!biz) return NextResponse.json({ error: 'No business found' }, { status: 404 });

  // Sum all-time analytics
  const { data: rows } = await serviceClient
    .from('business_analytics')
    .select('profile_views, call_clicks, whatsapp_clicks')
    .eq('business_id', biz.id);

  const totals = (rows ?? []).reduce(
    (acc, r) => ({
      views: acc.views + (r.profile_views || 0),
      calls: acc.calls + (r.call_clicks || 0),
      whatsapp: acc.whatsapp + (r.whatsapp_clicks || 0),
    }),
    { views: 0, calls: 0, whatsapp: 0 }
  );

  return NextResponse.json({ name: biz.name, plan: biz.plan, ...totals });
}

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getServiceClient } from '@/lib/supabase';

export async function GET(_req: NextRequest) {
  // Verify session and admin identity server-side
  const adminEmail = process.env.ADMIN_EMAIL;
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user || !adminEmail || user.email !== adminEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Read pending claims via service role — bypasses RLS
  const service = getServiceClient();
  const { data, error } = await service
    .from('claims')
    .select('*, businesses(name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[admin/claims] fetch error:', error);
    return NextResponse.json({ error: 'Failed to load claims' }, { status: 500 });
  }

  return NextResponse.json({ claims: data ?? [] });
}

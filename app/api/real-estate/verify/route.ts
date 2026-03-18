import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await req.json();
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Property id is required' }, { status: 400 });
    }

    const supabase = getServiceClient();
    const now = new Date().toISOString();

    // owner_id filter is the security gate — only the owner's own row is updated
    const { data, error } = await supabase
      .from('properties')
      .update({ last_verified_at: now })
      .eq('id', id)
      .eq('owner_id', user.id)
      .select('id, last_verified_at')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Not found or not authorised' }, { status: 404 });
    }

    return NextResponse.json({ id: data.id, last_verified_at: data.last_verified_at });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

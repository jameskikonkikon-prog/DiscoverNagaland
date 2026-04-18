import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getServiceClient } from '@/lib/supabase';

export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { business_id, photos, menu_url } = await req.json();
    if (!business_id) return NextResponse.json({ error: 'Missing business_id' }, { status: 400 });

    const supabase = getServiceClient();

    const updates: Record<string, unknown> = {};
    if (Array.isArray(photos) && photos.length > 0) updates.photos = photos;
    if (menu_url) updates.menu_url = menu_url;

    if (Object.keys(updates).length === 0) return NextResponse.json({ success: true });

    const { error } = await supabase
      .from('businesses')
      .update(updates)
      .eq('id', business_id)
      .eq('owner_id', user.id);

    if (error) return NextResponse.json({ error: 'Failed to update media' }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Media update error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

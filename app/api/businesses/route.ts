import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getServiceClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    // Authenticate — owner_id is always taken from the session, never the request body
    const cookieStore = await cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    // owner_id is intentionally excluded from destructuring — it is set server-side below
    const { name, category, city, address, landmark, phone, whatsapp, email, website, description, opening_hours, tags, amenities, slug, custom_fields, vibe_tags, price_min, price_max, price_range, gender, wifi, ac, meals_included, room_type, cuisine } = body;

    if (!name || !category || !city || !address || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getServiceClient();

    const { data, error } = await supabase.from('businesses').insert({
      name,
      slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now(),
      category, city, address,
      landmark: landmark || null,
      phone,
      whatsapp: whatsapp || null,
      email: email || null,
      website: website || null,
      description: description || null,
      opening_hours: opening_hours || null,
      tags: tags || null,
      amenities: amenities || null,
      custom_fields: custom_fields || null,
      vibe_tags: vibe_tags || null,
      price_min: price_min || null,
      price_max: price_max || null,
      price_range: price_range || null,
      gender: gender || null,
      wifi: wifi || null,
      ac: ac || null,
      meals_included: meals_included || null,
      room_type: room_type || null,
      cuisine: cuisine || null,
      owner_id: user.id,
      plan: 'free',
      is_active: true,
      is_verified: false,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Send welcome email
    if (email) {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/emails/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'welcome', email, name }),
      }).catch(console.error);
    }

    return NextResponse.json({ business: data }, { status: 201 });
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const city = searchParams.get('city');
    const q = searchParams.get('q');

    const supabase = getServiceClient();
    let query = supabase.from('businesses').select('*').eq('is_active', true);
    if (category) query = query.eq('category', category);
    if (city) query = query.eq('city', city);
    if (q) {
      // Strip ILIKE wildcard characters (% _) to prevent pattern abuse; cap length
      const safeQ = q.trim().slice(0, 100).replace(/[%_]/g, '');
      if (safeQ) query = query.or(`name.ilike.%${safeQ}%,description.ilike.%${safeQ}%,tags.ilike.%${safeQ}%,category.ilike.%${safeQ}%,city.ilike.%${safeQ}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ businesses: data });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

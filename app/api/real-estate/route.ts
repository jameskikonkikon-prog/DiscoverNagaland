import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('is_available', true)
      .gte('last_verified_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      // Gracefully handle missing table (code 42P01 = undefined_table in Postgres)
      if (
        error.code === '42P01' ||
        error.message?.toLowerCase().includes('does not exist') ||
        error.message?.toLowerCase().includes('relation')
      ) {
        return NextResponse.json({ properties: [] }, { status: 200 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ properties: data ?? [] }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate — owner_id is always taken from session, never client body
    const cookieStore = await cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      title, property_type, listing_type, city, locality, landmark,
      price, price_unit, area, area_unit, description, photos,
      posted_by_name, phone, whatsapp,
    } = body;

    // Validate required fields
    if (!title?.trim()) return NextResponse.json({ error: 'title is required' }, { status: 400 });
    if (!property_type?.trim()) return NextResponse.json({ error: 'property_type is required' }, { status: 400 });
    if (!listing_type?.trim()) return NextResponse.json({ error: 'listing_type is required' }, { status: 400 });
    if (!city?.trim()) return NextResponse.json({ error: 'city is required' }, { status: 400 });
    if (!price || isNaN(Number(price)) || Number(price) <= 0) return NextResponse.json({ error: 'price must be a positive number' }, { status: 400 });

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('properties')
      .insert({
        // explicit allowlist — no ...rest
        title: title.trim(),
        property_type: property_type.trim(),
        listing_type: listing_type.trim(),
        city: city.trim(),
        price: Number(price),
        ...(locality    && { locality: String(locality).trim() }),
        ...(landmark    && { landmark: String(landmark).trim() }),
        ...(price_unit  && { price_unit: String(price_unit).trim() }),
        ...(area        && { area: String(area).trim() }),
        ...(area_unit   && { area_unit: String(area_unit).trim() }),
        ...(description && { description: String(description).trim() }),
        ...(photos      && { photos }),
        ...(posted_by_name && { posted_by_name: String(posted_by_name).trim() }),
        ...(phone       && { phone: String(phone).trim() }),
        ...(whatsapp    && { whatsapp: String(whatsapp).trim() }),
        // server-controlled — never from client
        owner_id: user.id,
        is_available: true,
        is_featured: false,
        last_verified_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ property: data }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

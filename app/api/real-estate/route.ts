export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const listing_type = searchParams.get('listing_type');  // sale | rent
  const property_type = searchParams.get('property_type'); // land | house | apartment | commercial
  const city = searchParams.get('city');

  let query = supabase
    .from('properties')
    .select('id, title, property_type, listing_type, city, locality, landmark, price, price_unit, area, area_unit, description, photos, posted_by_name, phone, whatsapp, is_available, is_featured, created_at')
    .eq('is_available', true)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(60);

  if (listing_type) query = query.eq('listing_type', listing_type);
  if (property_type) query = query.eq('property_type', property_type);
  if (city) query = query.ilike('city', city);

  const { data, error } = await query;

  if (error) {
    console.error('[real-estate] fetch error:', error);
    return NextResponse.json({ error: 'Failed to load properties' }, { status: 500 });
  }

  return NextResponse.json({ properties: data ?? [] });
}

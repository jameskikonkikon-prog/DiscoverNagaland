import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, category, city, address, landmark, phone, whatsapp, email, website, description, opening_hours, tags, amenities, owner_id, slug, custom_fields } = body;

    if (!name || !category || !city || !address || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getServiceClient();
    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

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
      owner_id: owner_id || null,
      plan: 'trial',
      trial_ends_at: trialEndsAt,
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
    if (q) query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%,tags.ilike.%${q}%,category.ilike.%${q}%,city.ilike.%${q}%`);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ businesses: data });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

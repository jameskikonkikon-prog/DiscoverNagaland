import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { generateSlug } from '@/lib/search';

export async function GET() {
  const serviceClient = getServiceClient();
  const { data, error } = await serviceClient
    .from('businesses')
    .select('*')
    .eq('is_active', true)
    .order('plan', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ businesses: data });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, category, city, address, landmark, phone, whatsapp, email, description, opening_hours, owner_id } = body;

  if (!name || !category || !city || !address || !phone) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const serviceClient = getServiceClient();

  // Generate unique slug
  let slug = generateSlug(name, city);
  const { data: existing } = await serviceClient.from('businesses').select('id').eq('slug', slug);
  if (existing && existing.length > 0) {
    slug = `${slug}-${Date.now()}`;
  }

  const { data, error } = await serviceClient
    .from('businesses')
    .insert({ name, slug, category, city, address, landmark, phone, whatsapp, email, description, opening_hours, owner_id, plan: 'free' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ business: data });
}

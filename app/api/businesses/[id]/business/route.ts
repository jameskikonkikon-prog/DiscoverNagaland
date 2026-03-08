export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { PLANS } from '@/types';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }
  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data, error } = await client.from('businesses').select('*').eq('id', params.id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ business: data });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }
  const body = await request.json();

  const ALLOWED_COLUMNS = new Set([
    'name','slug','category','city','address','landmark','phone','whatsapp','email',
    'description','opening_hours','photos','plan','plan_expires_at','is_verified',
    'is_active','owner_id','price_range','price_min','price_max','price_unit',
    'menu_url','tags','website','amenities','custom_fields','trial_ends_at',
    'ac','wifi','parking','meals_included','gender','room_type','claimed','status',
    'area','vibe_tags','verified','featured','cuisine','furnished','trainer',
    'delivery','fuel_included','deposit','bhk','sport_types','floodlights',
    'covered','subjects','batch_size','timing','online','entry_fee','private_seating',
  ]);
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (ALLOWED_COLUMNS.has(key)) sanitized[key] = value;
  }

  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  if (Array.isArray(sanitized.photos)) {
    const { data: biz } = await client.from('businesses').select('plan').eq('id', params.id).single();
    const plan = (biz?.plan ?? 'basic') as 'basic' | 'pro' | 'plus';
    const maxPhotos = PLANS[plan]?.maxPhotos ?? (plan === 'plus' ? Infinity : plan === 'pro' ? 10 : 2);
    if (typeof maxPhotos === 'number' && sanitized.photos.length > maxPhotos) {
      sanitized.photos = sanitized.photos.slice(0, maxPhotos);
    }
  }

  const { data, error } = await client.from('businesses').update(sanitized).eq('id', params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ business: data });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { event } = await request.json();
  try {
    const today = new Date().toISOString().split('T')[0];
    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: existing } = await client.from('business_analytics').select('*').eq('business_id', params.id).eq('date', today).single();
    if (existing) {
      await client.from('business_analytics').update({ [event]: (existing[event] || 0) + 1 }).eq('id', existing.id);
    } else {
      await client.from('business_analytics').insert({ business_id: params.id, date: today, [event]: 1 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

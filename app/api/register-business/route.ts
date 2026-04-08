import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getServiceClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    // Authenticate from session cookie — never trust client-supplied user ID
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
    const {
      name, category, city, address, landmark, phone, whatsapp,
      email, website, description, opening_hours, slug,
      custom_fields,
    } = body;

    const toArray = (v: unknown): string[] | null => {
      if (!v) return null;
      if (Array.isArray(v)) return v;
      if (typeof v === 'string') return v.split(',').map((s: string) => s.trim()).filter(Boolean);
      return null;
    };

    const vibe_tags = toArray(body.vibe_tags);
    const tags      = toArray(body.tags);
    const amenities = toArray(body.amenities);
    const photos    = toArray(body.photos);

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
      custom_fields: custom_fields || null,
      vibe_tags,
      tags,
      amenities,
      photos,
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
    console.error('Register business error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { FOUNDING_MEMBER_LIMIT } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      signup_user_id,
      name, category, city, address, landmark, phone, whatsapp,
      email, website, description, opening_hours, slug,
      custom_fields, vibe_tags,
    } = body;

    if (!signup_user_id) {
      return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
    }
    if (!name || !category || !city || !address || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Verify the user actually exists in auth.users — prevents spoofed IDs
    const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(signup_user_id);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: 'Invalid user' }, { status: 401 });
    }

    // Check founding member spots
    const { count } = await supabase
      .from('businesses')
      .select('*', { count: 'exact', head: true })
      .eq('plan', 'pro')
      .is('plan_expires_at', null);
    const isFoundingMember = (count || 0) < FOUNDING_MEMBER_LIMIT;

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
      vibe_tags: vibe_tags || null,
      owner_id: userData.user.id,
      plan: isFoundingMember ? 'pro' : 'basic',
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

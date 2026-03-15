export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/** Strip HTML tags and trim */
function sanitize(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/<[^>]*>/g, '').trim();
}

async function sendClaimEmail(fields: {
  business_id: string;
  name: string;
  phone: string;
  email: string;
  designation: string;
}) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'claims@yananagaland.com',
      to: 'jameskikonkikon@gmail.com',
      subject: 'New listing claim request',
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:2rem;">
          <h2 style="color:#c0392b;">New Listing Claim Request</h2>
          <table style="width:100%;border-collapse:collapse;font-size:0.95rem;">
            <tr><td style="padding:8px 0;color:#888;width:140px;">Business ID</td><td style="padding:8px 0;font-weight:600;">${fields.business_id}</td></tr>
            <tr><td style="padding:8px 0;color:#888;">Claimant Name</td><td style="padding:8px 0;font-weight:600;">${fields.name}</td></tr>
            <tr><td style="padding:8px 0;color:#888;">Phone</td><td style="padding:8px 0;">${fields.phone}</td></tr>
            <tr><td style="padding:8px 0;color:#888;">Email</td><td style="padding:8px 0;">${fields.email}</td></tr>
            <tr><td style="padding:8px 0;color:#888;">Designation</td><td style="padding:8px 0;">${fields.designation || '—'}</td></tr>
          </table>
          <p style="margin-top:1.5rem;font-size:0.85rem;color:#888;">Review and approve or reject this claim in Supabase.</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('[claim] Resend error:', res.status, body);
    throw new Error('Failed to send claim email');
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const business_id = sanitize(body.business_id);
    const name        = sanitize(body.name);
    const phone       = sanitize(body.phone);
    const email       = sanitize(body.email);
    const designation = sanitize(body.designation);

    // Validate required fields
    if (!business_id) return NextResponse.json({ error: 'business_id is required' }, { status: 400 });
    if (!name)        return NextResponse.json({ error: 'name is required' }, { status: 400 });
    if (!phone)       return NextResponse.json({ error: 'phone is required' }, { status: 400 });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return NextResponse.json({ error: 'valid email is required' }, { status: 400 });

    // Read logged-in user's id (if any) — used to transfer ownership on approve
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { session } } = await supabaseAuth.auth.getSession();
    const claimant_user_id = session?.user?.id ?? null;

    // Insert into claims table
    const { error: dbError } = await supabase
      .from('claims')
      .insert({ business_id, name, phone, email, designation: designation || null, status: 'pending', claimant_user_id });

    if (dbError) {
      console.error('[claim] DB insert error:', dbError);
      return NextResponse.json({ error: 'Failed to save claim' }, { status: 500 });
    }

    console.log('[claim] inserted — business_id:', business_id, '| claimant:', name, email);

    // Send notification email
    await sendClaimEmail({ business_id, name, phone, email, designation });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[claim] error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

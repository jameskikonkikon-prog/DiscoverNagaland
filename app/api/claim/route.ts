export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

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
      to: process.env.ADMIN_EMAIL,
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
          <p style="margin-top:1.5rem;font-size:0.85rem;color:#888;">Review and approve or reject this claim in the admin panel.</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('[claim] Resend error:', res.status, body);
    // Non-fatal — claim is already saved
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
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });

    const service = getServiceClient();

    // Invite the claimant by email. Supabase sends an invite link; the account
    // is unconfirmed until the claimant clicks it. They cannot log in before
    // accepting. email_confirm: true is intentionally NOT used here.
    const { data: authData, error: authError } = await service.auth.admin.inviteUserByEmail(email);

    if (authError) {
      // Supabase returns this message when the email is already registered
      const isDuplicate =
        authError.message?.toLowerCase().includes('already registered') ||
        authError.message?.toLowerCase().includes('already exists') ||
        authError.message?.toLowerCase().includes('already been invited') ||
        authError.message?.toLowerCase().includes('email_exists') ||
        (authError as { code?: string }).code === 'email_exists';

      if (isDuplicate) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please log in or use a different email.' },
          { status: 409 }
        );
      }

      console.error('[claim] auth.admin.inviteUserByEmail error:', authError);
      return NextResponse.json({ error: 'Failed to create account. Please try again.' }, { status: 500 });
    }

    const claimant_user_id = authData.user.id;

    // Insert claim row
    const { error: dbError } = await service
      .from('claims')
      .insert({ business_id, name, phone, email, designation: designation || null, status: 'pending', claimant_user_id });

    if (dbError) {
      console.error('[claim] DB insert error:', dbError);
      // Roll back the created auth user so they don't end up with an orphaned account
      await service.auth.admin.deleteUser(claimant_user_id);
      return NextResponse.json({ error: 'Failed to save claim. Please try again.' }, { status: 500 });
    }

    // Send notification email (non-fatal)
    await sendClaimEmail({ business_id, name, phone, email, designation });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[claim] error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

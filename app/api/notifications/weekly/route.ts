export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = getServiceClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data: businesses } = await serviceClient
    .from('businesses')
    .select('*, owner:owner_id(email)')
    .neq('plan', 'free')
    .eq('is_active', true);

  if (!businesses) return NextResponse.json({ sent: 0 });

  let sent = 0;
  for (const business of businesses) {
    const { data: analytics } = await serviceClient
      .from('business_analytics')
      .select('*')
      .eq('business_id', business.id)
      .gte('date', since);

    const totals = (analytics || []).reduce(
      (acc: Record<string, number>, a: Record<string, number>) => ({
        views: acc.views + (a.profile_views || 0),
        searches: acc.searches + (a.search_appearances || 0),
        whatsapp: acc.whatsapp + (a.whatsapp_clicks || 0),
        calls: acc.calls + (a.call_clicks || 0),
      }),
      { views: 0, searches: 0, whatsapp: 0, calls: 0 }
    );

    const ownerEmail = (business.owner as { email?: string })?.email;
    if (!ownerEmail) continue;

    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { email: process.env.FROM_EMAIL, name: process.env.FROM_NAME },
        to: [{ email: ownerEmail }],
        subject: `Your weekly report for ${business.name}`,
        htmlContent: `
          <h2>Weekly Report for ${business.name}</h2>
          <p>Here's how your business performed this week:</p>
          <ul>
            <li>👁️ Profile Views: <strong>${totals.views}</strong></li>
            <li>🔍 Search Appearances: <strong>${totals.searches}</strong></li>
            <li>💬 WhatsApp Clicks: <strong>${totals.whatsapp}</strong></li>
            <li>📞 Calls: <strong>${totals.calls}</strong></li>
          </ul>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard">View full dashboard →</a></p>
        `,
      }),
    });
    sent++;
  }

  return NextResponse.json({ sent });
}

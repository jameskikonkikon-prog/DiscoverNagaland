import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  // Protect with secret
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServiceClient();
  const now = new Date();

  // Trial ending in 5 days — send warning email
  const warningDate = new Date(now);
  warningDate.setDate(warningDate.getDate() + 5);
  const warningStart = warningDate.toISOString().split('T')[0] + 'T00:00:00Z';
  const warningEnd = warningDate.toISOString().split('T')[0] + 'T23:59:59Z';

  const { data: endingSoon } = await supabase.from('businesses')
    .select('id, name, email')
    .eq('plan', 'trial')
    .gte('trial_ends_at', warningStart)
    .lte('trial_ends_at', warningEnd)
    .not('email', 'is', null);

  for (const biz of (endingSoon || [])) {
    if (!biz.email) continue;
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/emails/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'trial_ending', email: biz.email, name: biz.name }),
    }).catch(console.error);
  }

  // Trial ended today — move to free and send email
  const { data: expired } = await supabase.from('businesses')
    .select('id, name, email')
    .eq('plan', 'trial')
    .lt('trial_ends_at', now.toISOString())
    .not('email', 'is', null);

  for (const biz of (expired || [])) {
    await supabase.from('businesses').update({ plan: 'free' }).eq('id', biz.id);
    if (!biz.email) continue;
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/emails/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'trial_ended', email: biz.email, name: biz.name }),
    }).catch(console.error);
  }

  return NextResponse.json({
    warningSent: endingSoon?.length || 0,
    expired: expired?.length || 0,
  });
}

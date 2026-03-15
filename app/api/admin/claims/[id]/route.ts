export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getServiceClient } from '@/lib/supabase';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Auth check — admin email is read from server-side env only, never bundled client-side
  const adminEmail = process.env.ADMIN_EMAIL;
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user || !adminEmail || user.email !== adminEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { action } = await req.json();
  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const service = getServiceClient();
  const claimId = params.id;

  // Fetch the claim to get business_id and claimant_user_id
  const { data: claim, error: fetchErr } = await service
    .from('claims')
    .select('business_id, claimant_user_id')
    .eq('id', claimId)
    .single();

  if (fetchErr || !claim) {
    return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
  }

  // Update claim status
  const { error: claimErr } = await service
    .from('claims')
    .update({ status: action === 'approve' ? 'approved' : 'rejected' })
    .eq('id', claimId);

  if (claimErr) {
    console.error('[admin/claims] claim update error:', claimErr);
    return NextResponse.json({ error: 'Failed to update claim' }, { status: 500 });
  }

  // If approving, mark the business as claimed and transfer ownership
  if (action === 'approve') {
    // Always set claimed = true
    // Set owner_id = claimant_user_id only if it was captured at claim time
    const bizUpdate: Record<string, unknown> = { claimed: true };
    if (claim.claimant_user_id) {
      bizUpdate.owner_id = claim.claimant_user_id;
    }

    const { error: bizErr } = await service
      .from('businesses')
      .update(bizUpdate)
      .eq('id', claim.business_id);

    if (bizErr) {
      console.error('[admin/claims] businesses update error:', bizErr);
      // Non-fatal: claim status is already updated
    }
  }

  console.log(
    `[admin/claims] ${action}d claim ${claimId}`,
    `(business ${claim.business_id}, new owner: ${claim.claimant_user_id ?? 'none'})`
  );
  return NextResponse.json({ success: true });
}

/**
 * Plan Migration Script
 * ---------------------
 * Migrates all businesses from old plan system (basic/pro/plus) to new system (free/pro).
 *
 * Migration rules:
 *   old 'plus'  → new 'pro'   (keeps all Pro entitlements: verified, analytics, featured, priority)
 *   old 'basic' → new 'free'
 *   old 'pro'   → new 'free'  (old Pro plan no longer exists)
 *
 * Entitlement changes:
 *   Free users (was basic or old pro):
 *     - photos capped at 5 (photos beyond 5 moved to hidden_photos, NOT deleted)
 *     - is_verified set to false
 *     - featured set to false
 *     - priority_ranking set to false (if column exists)
 *
 *   Pro users (was plus):
 *     - is_verified set to true
 *     - featured set to true
 *     - all photos remain visible
 *
 * USAGE:
 *   Dry run (show changes, do nothing):
 *     node scripts/migrate-plans.js
 *
 *   Apply changes (requires --run flag):
 *     node scripts/migrate-plans.js --run
 *
 * REQUIRES: SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in environment.
 * Run from the project root:
 *   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... node scripts/migrate-plans.js
 */

const { createClient } = require('@supabase/supabase-js');

const DRY_RUN = !process.argv.includes('--run');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const FREE_PHOTO_LIMIT = 5;

async function main() {
  console.log('');
  console.log('='.repeat(60));
  console.log('  PLAN MIGRATION' + (DRY_RUN ? ' — DRY RUN (no changes will be made)' : ' — LIVE RUN'));
  console.log('='.repeat(60));
  console.log('');

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('ERROR: Missing environment variables.');
    console.error('  NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
    process.exit(1);
  }

  // ── 1. Fetch all businesses ────────────────────────────────────────────────
  const { data: businesses, error } = await supabase
    .from('businesses')
    .select('id, name, plan, is_verified, featured, photos, plan_expires_at')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch businesses:', error.message);
    process.exit(1);
  }

  console.log(`Total businesses fetched: ${businesses.length}`);
  console.log('');

  // ── 2. Categorise ─────────────────────────────────────────────────────────
  const oldPlus  = businesses.filter(b => b.plan === 'plus');
  const oldBasic = businesses.filter(b => b.plan === 'basic');
  const oldPro   = businesses.filter(b => b.plan === 'pro');
  const alreadyFree = businesses.filter(b => b.plan === 'free');
  const alreadyNewPro = businesses.filter(b => b.plan === 'pro' && false); // none yet — handled above
  const unknown  = businesses.filter(b => !['basic', 'pro', 'plus', 'free'].includes(b.plan));

  console.log('── Current plan breakdown ──────────────────────────────────');
  console.log(`  old 'plus'  (→ new 'pro'):  ${oldPlus.length} businesses`);
  console.log(`  old 'basic' (→ new 'free'): ${oldBasic.length} businesses`);
  console.log(`  old 'pro'   (→ new 'free'): ${oldPro.length} businesses`);
  console.log(`  already 'free':              ${alreadyFree.length} businesses`);
  console.log(`  unknown plan:                ${unknown.length} businesses`);
  console.log('');

  // ── 3. Flag active subscriptions (old 'plus' with non-expired plan) ────────
  const activeSubscriptions = businesses.filter(b => {
    if (b.plan !== 'plus' && b.plan !== 'pro') return false;
    if (!b.plan_expires_at) return true; // no expiry = permanent / founding member
    return new Date(b.plan_expires_at) > new Date();
  });

  console.log('── Active paid subscriptions (DO NOT CANCEL — review manually) ──');
  if (activeSubscriptions.length === 0) {
    console.log('  None found.');
  } else {
    activeSubscriptions.forEach(b => {
      const expiry = b.plan_expires_at
        ? `expires ${new Date(b.plan_expires_at).toLocaleDateString()}`
        : 'no expiry (permanent)';
      console.log(`  [${b.plan.toUpperCase()}] ${b.name} (${b.id}) — ${expiry}`);
    });
  }
  console.log('');

  // ── 4. Show per-business migration plan ───────────────────────────────────
  console.log('── Migration changes ────────────────────────────────────────');

  let changeCount = 0;
  const migrations = [];

  for (const biz of businesses) {
    const changes = {};
    const notes = [];

    if (biz.plan === 'plus') {
      // old Plus → new Pro: keep all entitlements
      changes.plan = 'pro';
      if (!biz.is_verified) { changes.is_verified = true; notes.push('is_verified → true'); }
      if (!biz.featured) { changes.featured = true; notes.push('featured → true'); }
      notes.unshift('plan: plus → pro');

    } else if (biz.plan === 'basic' || biz.plan === 'pro') {
      // old Basic/Pro → new Free: remove paid entitlements
      changes.plan = 'free';
      if (biz.is_verified) { changes.is_verified = false; notes.push('is_verified → false'); }
      if (biz.featured) { changes.featured = false; notes.push('featured → false'); }
      notes.unshift(`plan: ${biz.plan} → free`);

      // Photos: cap at 5, move excess to hidden_photos
      const photos = Array.isArray(biz.photos) ? biz.photos : [];
      if (photos.length > FREE_PHOTO_LIMIT) {
        changes.photos = photos.slice(0, FREE_PHOTO_LIMIT);
        changes.hidden_photos = photos.slice(FREE_PHOTO_LIMIT);
        notes.push(`photos: ${photos.length} → ${FREE_PHOTO_LIMIT} visible, ${photos.length - FREE_PHOTO_LIMIT} hidden (not deleted)`);
      }

    } else if (biz.plan === 'free') {
      // Already migrated or already correct
      continue;
    } else {
      // Unknown plan — skip
      notes.push(`SKIPPED: unknown plan '${biz.plan}'`);
    }

    if (Object.keys(changes).length > 0) {
      changeCount++;
      migrations.push({ biz, changes, notes });
      console.log(`  ${biz.name} (${biz.id})`);
      notes.forEach(n => console.log(`    → ${n}`));
    }
  }

  if (changeCount === 0) {
    console.log('  No changes needed — all businesses already on new plan system.');
  }

  console.log('');
  console.log(`Total businesses to update: ${changeCount}`);
  console.log('');

  if (DRY_RUN) {
    console.log('── DRY RUN COMPLETE — no changes were made ─────────────────');
    console.log('');
    console.log('To apply these changes, run:');
    console.log('  SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... node scripts/migrate-plans.js --run');
    console.log('');
    return;
  }

  // ── 5. Apply changes ──────────────────────────────────────────────────────
  console.log('── Applying changes ─────────────────────────────────────────');
  let successCount = 0;
  let failCount = 0;

  for (const { biz, changes, notes } of migrations) {
    const { error: updateError } = await supabase
      .from('businesses')
      .update(changes)
      .eq('id', biz.id);

    if (updateError) {
      console.error(`  FAILED: ${biz.name} (${biz.id}) — ${updateError.message}`);
      failCount++;
    } else {
      console.log(`  OK: ${biz.name} — ${notes.join(', ')}`);
      successCount++;
    }
  }

  console.log('');
  console.log('── Migration complete ───────────────────────────────────────');
  console.log(`  Success: ${successCount}`);
  console.log(`  Failed:  ${failCount}`);
  console.log('');

  if (failCount > 0) {
    console.error('Some migrations failed. Check errors above and retry.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});

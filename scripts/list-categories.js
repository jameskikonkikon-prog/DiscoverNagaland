/**
 * Fetch all businesses from Supabase and print unique category values.
 * Run from project root: node scripts/list-categories.js
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or ANON_KEY).
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  try {
    const buf = fs.readFileSync(envPath, 'utf8');
    buf.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const idx = trimmed.indexOf('=');
      if (idx === -1) return;
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
        val = val.slice(1, -1);
      process.env[key] = val;
    });
  } catch (e) {
    console.error('Could not load .env.local:', e.message);
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or Supabase key in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  const { data, error } = await supabase
    .from('businesses')
    .select('id, category');

  if (error) {
    console.error('Supabase error:', error.message);
    process.exit(1);
  }

  const list = data || [];
  const categories = [...new Set(list.map((b) => (b.category || '(empty)').trim()).filter(Boolean))];
  categories.sort((a, b) => a.localeCompare(b, 'en'));

  console.log('Total businesses:', list.length);
  console.log('Unique categories (' + categories.length + '):\n');
  categories.forEach((c) => console.log('  -', c));
}

main();

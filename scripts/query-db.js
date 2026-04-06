/**
 * Inspect Supabase businesses table.
 * Run: node scripts/query-db.js
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  try {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
        val = val.slice(1, -1);
      process.env[key] = val;
    }
  } catch {
    console.error('Could not load .env.local — ensure file exists');
    process.exit(1);
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or Supabase key');
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  console.log('Fetching data from Supabase...\n');

  // ── All businesses (key columns only)
  const { data: all, error } = await supabase
    .from('businesses')
    .select('id,name,category,city,area,tags,amenities,description,gender,wifi,ac')
    .or('is_active.eq.true,is_active.is.null');

  if (error) { console.error('Supabase error:', error.message); process.exit(1); }
  const rows = all || [];
  console.log(`Total active businesses: ${rows.length}\n`);

  // ── Distinct categories
  const categories = [...new Set(rows.map(r => r.category).filter(Boolean))].sort();
  console.log(`Distinct categories (${categories.length}):`);
  categories.forEach(c => console.log(`  "${c}"`));

  // ── Category counts
  console.log('\nCategory counts:');
  const catCount = {};
  rows.forEach(r => { catCount[r.category] = (catCount[r.category] || 0) + 1; });
  Object.entries(catCount).sort((a,b) => b[1]-a[1]).forEach(([c,n]) => console.log(`  ${n.toString().padStart(4)}  ${c}`));

  // ── Distinct cities
  const cities = [...new Set(rows.map(r => r.city).filter(Boolean))].sort();
  console.log(`\nDistinct cities (${cities.length}):`);
  cities.forEach(c => console.log(`  "${c}"`));

  // ── Area samples
  const areas = [...new Set(rows.map(r => r.area).filter(Boolean))].sort();
  console.log(`\nDistinct area values (${areas.length}) — sample of 30:`);
  areas.slice(0, 30).forEach(a => console.log(`  "${a}"`));

  // ── Tags samples
  const tagRows = rows.filter(r => r.tags).slice(0, 20);
  console.log(`\nSample tags (${tagRows.length} rows):`);
  tagRows.forEach(r => console.log(`  [${r.category}] ${r.name}: ${r.tags}`));

  // ── Amenities samples
  const amenRows = rows.filter(r => r.amenities).slice(0, 20);
  console.log(`\nSample amenities (${amenRows.length} rows):`);
  amenRows.forEach(r => console.log(`  [${r.category}] ${r.name}: ${r.amenities}`));

  // ── Gender field
  const genderRows = rows.filter(r => r.gender);
  console.log(`\nGender field values:`);
  const genders = [...new Set(genderRows.map(r => r.gender))];
  genders.forEach(g => console.log(`  "${g}"`));

  // ── wifi/ac boolean counts
  const wifiCount = rows.filter(r => r.wifi === true).length;
  const acCount   = rows.filter(r => r.ac   === true).length;
  console.log(`\nwifi=true: ${wifiCount},  ac=true: ${acCount}`);
}

main().catch(err => { console.error(err); process.exit(1); });

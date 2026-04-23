/**
 * Run the cascade FK migration against Supabase.
 *
 * Usage (option A — direct connection):
 *   DATABASE_URL="postgres://postgres.[ref]:[password]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres" \
 *   node scripts/apply-cascade-migration.js
 *
 * Usage (option B — Supabase project password env var):
 *   SUPABASE_DB_PASSWORD=your_db_password node scripts/apply-cascade-migration.js
 *
 * If neither is provided, the SQL is printed so you can paste it into
 * the Supabase SQL Editor:
 *   https://app.supabase.com/project/uzgbyltxvnmnxfyvtggp/sql/new
 */
const fs   = require('fs');
const path = require('path');

const SQL_FILE = path.join(__dirname, '..', 'supabase', 'migrations', '20260423_cascade_user_fks.sql');
const sql = fs.readFileSync(SQL_FILE, 'utf8');

// ── Determine connection string ───────────────────────────────────────────────
let dbUrl = process.env.DATABASE_URL;

if (!dbUrl && process.env.SUPABASE_DB_PASSWORD) {
  const PROJECT_REF = 'uzgbyltxvnmnxfyvtggp';
  const pw = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD);
  dbUrl = `postgres://postgres.${PROJECT_REF}:${pw}@aws-0-ap-south-1.pooler.supabase.com:5432/postgres`;
}

if (!dbUrl) {
  console.log('\n⚠️  No database URL provided.\n');
  console.log('Run with your DB password:');
  console.log('  SUPABASE_DB_PASSWORD=your_password node scripts/apply-cascade-migration.js\n');
  console.log('Or paste the SQL directly into the Supabase SQL Editor:');
  console.log('  https://app.supabase.com/project/uzgbyltxvnmnxfyvtggp/sql/new\n');
  console.log('─'.repeat(60));
  console.log(sql);
  process.exit(0);
}

// ── Run via pg ────────────────────────────────────────────────────────────────
let pg;
try {
  pg = require('pg');
} catch {
  console.error('\n❌ pg package not installed. Run: npm install pg\n');
  process.exit(1);
}

const { Client } = pg;

async function main() {
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Connected. Running migration…\n');

  // Capture NOTICE messages
  client.on('notice', (msg) => console.log('NOTICE:', msg.message));

  try {
    await client.query(sql);
    console.log('\n✅ Migration complete.');
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('\n❌ Migration failed:', err.message);
  process.exit(1);
});

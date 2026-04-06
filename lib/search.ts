/**
 * lib/search.ts — YanaNagaland business search
 *
 * Design: no metadata prefetch, no hardcoded category names.
 * Keywords from the query are matched directly against name/category/description/
 * city/tags/address via Supabase ilike. City is detected from a static list of
 * Nagaland cities (geographic knowledge, not business data). Conditions (wifi,
 * AC, girls-only, etc.) and price are applied as hard post-filters.
 */

import { getServiceClient } from './supabase';
import { Business } from '@/types';

export function generateSlug(name: string, city: string): string {
  return `${name}-${city}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ─── Cities ───────────────────────────────────────────────────────────────────
// Static list of Nagaland cities used to detect & strip city from query text.

const NAGALAND_CITIES = [
  'Kohima', 'Dimapur', 'Mokokchung', 'Wokha', 'Mon', 'Phek',
  'Tuensang', 'Zunheboto', 'Peren', 'Longleng', 'Kiphire',
  'Noklak', 'Shamator', 'Tseminyü', 'Chümoukedima', 'Niuland', 'Meluri',
];

export function detectCity(query: string): string | null {
  const lower = query.toLowerCase();
  // Longest-first avoids "Mon" matching inside "Mokokchung"
  const sorted = [...NAGALAND_CITIES].sort((a, b) => b.length - a.length);
  return sorted.find((c) => lower.includes(c.toLowerCase())) ?? null;
}

// ─── Stop words ───────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'in', 'at', 'of', 'for', 'and', 'or', 'with', 'to',
  'is', 'are', 'was', 'were', 'i', 'me', 'my', 'we', 'our', 'some', 'any',
  'where', 'which', 'want', 'place', 'find', 'near', 'best', 'good',
  'around', 'nearby', 'looking', 'show', 'get', 'list', 'need', 'under',
  'above', 'below', 'less', 'than', 'please', 'have', 'has', 'there',
]);

// ─── Price detection ──────────────────────────────────────────────────────────

const CURRENCY = '(?:₹|rs\\.?|rupees?)?\\s*';
const AMOUNT   = '(\\d+(?:\\.\\d+)?)(k)?';

function parseAmt(m: RegExpMatchArray): number {
  return parseFloat(m[1]) * (m[2] === 'k' ? 1000 : 1);
}

export function detectPriceCondition(
  query: string
): { max?: number; min?: number; detectedPrice?: number } | null {
  const s = query.toLowerCase();
  const m =
    s.match(new RegExp(`(?:under|below)\\s*${CURRENCY}${AMOUNT}`)) ||
    s.match(new RegExp(`less\\s+than\\s*${CURRENCY}${AMOUNT}`));
  if (m) { const v = parseAmt(m); return { max: v, detectedPrice: v }; }
  if (/\bcheap\b|\bbudget\b/.test(s))  return { max: 500,  detectedPrice: 500 };
  if (/\baffordable\b/.test(s))         return { max: 2000, detectedPrice: 2000 };
  return null;
}

// ─── Condition detection ──────────────────────────────────────────────────────

const CONDITION_RULES: { key: string; patterns: string[] }[] = [
  { key: 'wifi',         patterns: ['wifi', 'wi-fi', 'wi fi', 'internet'] },
  { key: 'ac',           patterns: ['with ac', 'air condition', 'air-condition', 'air conditioned', 'airconditioned'] },
  { key: 'parking',      patterns: ['parking', 'car park', 'bike park'] },
  { key: 'veg',          patterns: [' veg ', 'vegetarian', 'pure veg', 'veg food', 'veg only'] },
  { key: 'non-veg',      patterns: ['non-veg', 'nonveg', 'non veg'] },
  { key: 'girls',        patterns: ['girls', 'for girls', 'girls only', 'ladies', 'female', 'women'] },
  { key: 'boys',         patterns: ['boys', 'for boys', 'boys only', 'gents', 'male only', 'men only'] },
  { key: 'trainer',      patterns: ['with trainer', 'personal trainer', 'trainer'] },
  { key: 'pool',         patterns: ['swimming pool', 'with pool', ' pool'] },
  { key: 'meals',        patterns: ['meals included', 'food included', 'with meals', 'breakfast included'] },
  { key: '24hours',      patterns: ['24 hours', '24hr', '24/7', 'open 24', 'round the clock'] },
  { key: 'delivery',     patterns: ['delivery', 'home delivery'] },
  { key: 'takeaway',     patterns: ['takeaway', 'take away', 'takeout', 'take-away'] },
  { key: 'dine-in',      patterns: ['dine-in', 'dine in'] },
  { key: 'rooftop',      patterns: ['rooftop', 'roof top', 'terrace'] },
  { key: 'outdoor',      patterns: ['outdoor', 'open air', 'alfresco'] },
  { key: 'indoor',       patterns: ['indoor'] },
  { key: 'pet-friendly', patterns: ['pet friendly', 'pets allowed', 'pet allowed'] },
  { key: 'cctv',         patterns: ['cctv', 'surveillance'] },
  { key: 'laundry',      patterns: ['laundry', 'washing'] },
  { key: 'hot-water',    patterns: ['hot water', 'geyser'] },
  { key: 'furnished',    patterns: ['furnished', 'fully furnished'] },
];

function detectConditions(query: string): string[] {
  const s = ` ${query.toLowerCase()} `;
  return CONDITION_RULES.filter(({ patterns }) => patterns.some((p) => s.includes(p))).map(({ key }) => key);
}

// ─── Condition checkers ───────────────────────────────────────────────────────

type Biz = Business & { address?: string; landmark?: string; meals?: boolean };

function haystack(b: Biz): string {
  return [b.tags, b.amenities, b.description, b.vibe_tags, b.cuisine,
          JSON.stringify((b as Biz & { custom_fields?: unknown }).custom_fields || {})]
    .filter(Boolean).join(' ').toLowerCase();
}

function has(h: string, terms: string[]): boolean {
  return terms.some((t) => h.includes(t));
}

const CHECKERS: Record<string, (b: Biz, h: string) => boolean> = {
  wifi:          (b, h) => b.wifi === true    || has(h, ['wifi', 'wi-fi']),
  ac:            (b, h) => b.ac === true      || has(h, ['ac', 'air condition']),
  meals:         (b, h) => b.meals === true   || has(h, ['meal', 'breakfast']),
  girls:         (b, h) => /girl|female/i.test(b.gender || '') || has(h, ['girls', 'female', 'ladies', 'women']),
  boys:          (b, h) => /boy|^male/i.test(b.gender || '') || has(h, ['boys', 'gents']),
  trainer:       (_b, h) => has(h, ['trainer', 'personal trainer']),
  pool:          (_b, h) => has(h, ['pool', 'swimming']),
  parking:       (_b, h) => has(h, ['parking', 'car park']),
  veg:           (b, h) => /veg/i.test(b.cuisine || '') || has(h, ['vegetarian', 'pure veg']),
  'non-veg':     (_b, h) => has(h, ['non-veg', 'nonveg', 'chicken', 'meat']),
  '24hours':     (b, h) => (b.opening_hours || '').includes('24') || has(h, ['24 hour', '24/7']),
  delivery:      (_b, h) => has(h, ['delivery']),
  takeaway:      (_b, h) => has(h, ['takeaway', 'take away', 'takeout']),
  'dine-in':     (_b, h) => has(h, ['dine-in', 'dine in', 'dining']),
  rooftop:       (_b, h) => has(h, ['rooftop', 'roof top', 'terrace']),
  outdoor:       (_b, h) => has(h, ['outdoor', 'open air']),
  indoor:        (_b, h) => has(h, ['indoor']),
  'pet-friendly':(_b, h) => has(h, ['pet friendly', 'pets allowed']),
  cctv:          (_b, h) => has(h, ['cctv', 'surveillance']),
  laundry:       (_b, h) => has(h, ['laundry', 'washing']),
  'hot-water':   (_b, h) => has(h, ['hot water', 'geyser']),
  furnished:     (_b, h) => has(h, ['furnished']),
};

function passes(b: Biz, conditions: string[], price: { max?: number; min?: number } | null): boolean {
  if (price) {
    const pm = b.price_min != null ? Number(b.price_min) : null;
    if (pm == null) return false;
    if (price.max && pm > price.max) return false;
    if (price.min && pm < price.min) return false;
  }
  if (conditions.length > 0) {
    const h = haystack(b);
    for (const k of conditions) {
      const fn = CHECKERS[k];
      if (fn && !fn(b, h)) return false;
    }
  }
  return true;
}

// ─── Plan sort ────────────────────────────────────────────────────────────────

const PLAN_RANK: Record<string, number> = { plus: 0, pro: 1, basic: 2 };

function byPlan(list: Business[]): Business[] {
  return [...list].sort((a, b) => {
    const ra = PLAN_RANK[(a.plan || 'basic').toLowerCase()] ?? 3;
    const rb = PLAN_RANK[(b.plan || 'basic').toLowerCase()] ?? 3;
    return ra - rb;
  });
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

// Columns that actually exist in the businesses table schema
const COLS =
  'id,name,category,city,description,photos,plan,opening_hours,' +
  'price_range,price_min,is_verified,tags,amenities,vibe_tags,cuisine,' +
  'wifi,ac,meals,gender,custom_fields,phone,whatsapp,address,landmark,slug';

// Text columns searched with ilike. Include 'category' so "cafe" hits category='cafe'.
const SEARCH_COLS = ['name', 'category', 'description', 'city', 'tags', 'address'];

function ilikeClauses(keywords: string[]): string {
  const parts: string[] = [];
  for (const kw of keywords.slice(0, 10)) {
    const esc = kw.replace(/%/g, '\\%').replace(/_/g, '\\_');
    for (const col of SEARCH_COLS) parts.push(`${col}.ilike.%${esc}%`);
  }
  return parts.join(',');
}

type ServiceClient = ReturnType<typeof getServiceClient>;

async function runQuery(
  client: ServiceClient,
  city: string | null,
  keywords: string[]
): Promise<Business[]> {
  let q = client
    .from('businesses')
    .select(COLS)
    .or('is_active.eq.true,is_active.is.null');

  if (city) q = q.eq('city', city);

  if (keywords.length > 0) {
    const clause = ilikeClauses(keywords);
    if (clause) q = q.or(clause);
  }

  const { data, error } = await q;
  if (error) {
    console.error('[search] DB error:', JSON.stringify(error));
    return [];
  }
  return ((data as unknown) as Business[]) || [];
}

// ─── Strip conditions/price from query for related-results fallback ────────────

const STRIP_PATTERNS: (RegExp | string)[] = [
  /(?:under|below|less\s+than)\s*(?:₹|rs\.?|rupees?)?\s*\d+(?:\.\d+)?k?/gi,
  /\b(?:cheap|budget|affordable)\b/gi,
  'with personal trainer', 'personal trainer',
  'for girls only', 'girls only', 'for girls',
  'for boys only', 'boys only', 'for boys',
  'swimming pool', 'with pool',
  'meals included', 'food included', 'breakfast included', 'with meals',
  'pet friendly', 'pets allowed', 'fully furnished', 'with hot water', 'hot water',
  'air conditioned', 'air conditioning', 'air condition', 'with ac',
  'with wifi', 'with wi-fi', 'wi-fi',
  'with parking', 'car park', 'bike park',
  'round the clock', '24 hours', '24/7', '24hr',
  'home delivery', 'take away', 'take-away', 'takeout',
  'dine-in', 'dine in', 'open air', 'with rooftop', 'roof top',
  'with trainer', 'trainer', 'rooftop', 'outdoor', 'indoor',
  'furnished', 'laundry', 'cctv', 'surveillance',
  'wifi', 'parking', 'vegetarian', 'takeaway', 'delivery', 'geyser',
  'non-veg', 'nonveg',
  'girls', 'boys', 'ladies', 'female', 'male', 'gents',
];

export function stripConditions(query: string): string {
  let s = query.toLowerCase();
  for (const p of STRIP_PATTERNS) {
    if (p instanceof RegExp) s = s.replace(p, ' ');
    else s = s.split(p).join(' ');
  }
  return s.replace(/\s{2,}/g, ' ').trim();
}

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function searchBusinesses(
  query: string,
  cityFilter?: string
): Promise<{
  businesses: Business[];
  detectedCity: string | null;
  correctedQuery?: string;
  detectedPrice?: number | null;
  relatedResults?: Business[];
}> {
  const client = getServiceClient();

  const detectedCity   = detectCity(query);
  const activeCity     = cityFilter || detectedCity || null;
  const priceCondition = detectPriceCondition(query);
  const conditions     = detectConditions(query);
  const detectedPrice  = priceCondition?.detectedPrice ?? null;

  // Strip detected city from query before keyword extraction
  let cleanQuery = query.trim();
  if (detectedCity) {
    cleanQuery = cleanQuery.replace(new RegExp(detectedCity, 'gi'), '').trim();
  }

  const keywords = extractKeywords(cleanQuery);

  // Nothing to search
  if (!keywords.length && !activeCity) {
    return { businesses: [], detectedCity, detectedPrice };
  }

  // ── Fetch ──
  let results = await runQuery(client, activeCity, keywords);

  // ── Price filter (hard — return related if nothing passes) ──
  if (priceCondition) {
    const priceFiltered = results.filter((b) => passes(b as Biz, [], priceCondition));
    if (priceFiltered.length === 0) {
      const related = await runQuery(client, activeCity, extractKeywords(stripConditions(cleanQuery)));
      return { businesses: [], detectedCity, detectedPrice, relatedResults: byPlan(related) };
    }
    results = priceFiltered;
  }

  // ── Condition filter (hard — return related if nothing passes) ──
  if (conditions.length > 0) {
    const condFiltered = results.filter((b) => passes(b as Biz, conditions, null));
    if (condFiltered.length === 0) {
      const related = await runQuery(client, activeCity, extractKeywords(stripConditions(cleanQuery)));
      return { businesses: [], detectedCity, detectedPrice, relatedResults: byPlan(related) };
    }
    results = condFiltered;
  }

  // ── Typo fallback (shorten last word) ──
  if (results.length === 0 && cleanQuery.length >= 4) {
    for (const n of [2, 3]) {
      const parts = cleanQuery.trim().split(/\s+/);
      const last  = parts[parts.length - 1];
      if (last.length - n < 3) continue;
      const shortened = [...parts.slice(0, -1), last.slice(0, -n)].join(' ');
      const shortKws  = extractKeywords(shortened);
      if (!shortKws.length) continue;
      let fallback = await runQuery(client, activeCity, shortKws);
      if (priceCondition) fallback = fallback.filter((b) => passes(b as Biz, [], priceCondition));
      if (conditions.length > 0) fallback = fallback.filter((b) => passes(b as Biz, conditions, null));
      if (fallback.length > 0) {
        return { businesses: byPlan(fallback), detectedCity, correctedQuery: shortened, detectedPrice };
      }
    }
  }

  if (results.length === 0) {
    const hadFilters = conditions.length > 0 || priceCondition !== null;
    const relatedResults = hadFilters
      ? byPlan(await runQuery(client, activeCity, extractKeywords(stripConditions(cleanQuery))))
      : undefined;
    return { businesses: [], detectedCity, detectedPrice, relatedResults };
  }

  return { businesses: byPlan(results), detectedCity, detectedPrice };
}

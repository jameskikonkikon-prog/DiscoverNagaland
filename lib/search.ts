/**
 * lib/search.ts — YanaNagaland business search
 *
 * Dynamic-first design:
 *  - Category list and city list are fetched from the DB on first use and cached.
 *    No hardcoded category names or city names anywhere in this file.
 *  - Condition triggers (wifi, AC, girls, etc.) are linguistic intent signals
 *    and live in code, not the database.
 *  - Price patterns are regex/keyword rules.
 *
 * Flow:
 *  1. Load metadata (distinct categories + cities) from DB, cache 10 min.
 *  2. Detect city, categories, price condition, and feature conditions from query.
 *  3. Fetch businesses:
 *       - If a category is detected → exact eq/in filter + soft keyword post-filter.
 *       - Otherwise → ilike keyword search across text columns.
 *  4. Apply price filter (hard reject if no match).
 *  5. Apply condition filters (hard reject if no match).
 *  6. If empty → try typo fallback (shorten last word).
 *  7. If still empty → return related results (same category/keywords, no conditions).
 */

import { getServiceClient } from './supabase';
import { Business } from '@/types';

export function generateSlug(name: string, city: string): string {
  return `${name}-${city}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceClient = ReturnType<typeof getServiceClient>;

// ─── DB metadata cache ────────────────────────────────────────────────────────
// Categories and cities are fetched from the DB and cached. No hardcoded values.

interface DbMeta {
  categories: string[];
  cities: string[];
  loadedAt: number;
}

let _meta: DbMeta | null = null;
const META_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Categories that belong to the real-estate section, not the business directory.
 * Excluded from all business search queries and metadata so property listings
 * never mix in with business results.
 */
const PROPERTY_CATEGORIES = [
  'rental_house', 'real_estate', 'property', 'land', 'land_sale',
  'house_sale', 'flat', 'apartment_sale', 'property_listing',
];

async function loadMeta(client: ServiceClient): Promise<DbMeta> {
  if (_meta && Date.now() - _meta.loadedAt < META_TTL_MS) return _meta;

  const [catsRes, citiesRes] = await Promise.all([
    client
      .from('businesses')
      .select('category')
      .not('category', 'is', null)
      .not('category', 'in', `(${PROPERTY_CATEGORIES.join(',')})`)
      .or('is_active.eq.true,is_active.is.null'),
    client
      .from('businesses')
      .select('city')
      .not('city', 'is', null)
      .or('is_active.eq.true,is_active.is.null'),
  ]);

  const categories = [
    ...new Set(
      (catsRes.data || []).map((r: { category: string }) => r.category).filter(Boolean)
    ),
  ] as string[];

  const cities = [
    ...new Set(
      (citiesRes.data || []).map((r: { city: string }) => r.city).filter(Boolean)
    ),
  ] as string[];

  _meta = { categories, cities, loadedAt: Date.now() };
  return _meta;
}

// ─── Stop words ───────────────────────────────────────────────────────────────
// These are filtered out before category/keyword matching.

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'in', 'at', 'of', 'for', 'and', 'or', 'with', 'to',
  'is', 'are', 'was', 'were', 'i', 'me', 'my', 'we', 'our', 'some', 'any',
  'where', 'which', 'want', 'place', 'centre', 'center', 'find', 'near',
  'best', 'good', 'around', 'nearby', 'looking', 'show', 'get', 'list',
  'need', 'please', 'want', 'have', 'has',
]);

// ─── City detection ───────────────────────────────────────────────────────────

export function detectCity(query: string, cities: string[]): string | null {
  const lower = query.toLowerCase();
  // Longest match first avoids "Mon" matching inside "Mokokchung"
  const sorted = [...cities].sort((a, b) => b.length - a.length);
  return sorted.find((c) => lower.includes(c.toLowerCase())) ?? null;
}

// ─── Category detection ───────────────────────────────────────────────────────
//
// Matches query words against DB category slugs using these rules:
//  1. Exact full-slug match  ("coaching" == "coaching")
//  2. Query word equals a slug part split by _ ("study" matches "study_space")
//  3. A slug part starts with the query word ("coach" matches "coaching")
//  4. For 2-char words: only exact full-slug match  ("pg" matches "pg")
// No hardcoded synonym map — keyword search handles alternative words naturally.

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

function detectCategories(query: string, dbCategories: string[]): string[] | null {
  const words = normalize(query)
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));

  const matched = new Set<string>();

  for (const cat of dbCategories) {
    const catNorm = normalize(cat);
    const catParts = catNorm.split(/[_\-\s&,\/|]+/).filter((p) => p.length >= 2);

    for (const w of words) {
      if (w.length === 2) {
        // 2-char words: exact full-slug or exact part match (prevents "ac" hitting "coaching")
        if (catNorm === w || catParts.some((p) => p === w)) matched.add(cat);
      } else {
        // 3+ char words: match against parts of the slug
        if (
          catNorm === w ||
          catParts.some(
            (p) => p === w || p.startsWith(w) || w.startsWith(p)
          )
        ) {
          matched.add(cat);
        }
      }
    }
  }

  return matched.size > 0 ? [...matched] : null;
}

// ─── Price detection ──────────────────────────────────────────────────────────

const CURRENCY_PAT = '(?:₹|rs\\.?|rupees?)?\\s*';
const AMOUNT_PAT = '(\\d+(?:\\.\\d+)?)(k)?';

function parseAmount(m: RegExpMatchArray): number {
  return parseFloat(m[1]) * (m[2] === 'k' ? 1000 : 1);
}

export function detectPriceCondition(
  query: string
): { max?: number; min?: number; detectedPrice?: number } | null {
  const lower = query.toLowerCase();
  const underRe   = new RegExp(`(?:under|below)\\s*${CURRENCY_PAT}${AMOUNT_PAT}`);
  const lessRe    = new RegExp(`less\\s+than\\s*${CURRENCY_PAT}${AMOUNT_PAT}`);
  const m = lower.match(underRe) || lower.match(lessRe);
  if (m) {
    const max = parseAmount(m);
    return { max, detectedPrice: max };
  }
  if (/\bcheap\b|\bbudget\b/.test(lower)) return { max: 500,  detectedPrice: 500  };
  if (/\baffordable\b/.test(lower))        return { max: 2000, detectedPrice: 2000 };
  return null;
}

// ─── Condition detection ──────────────────────────────────────────────────────
// These are linguistic intent signals, not DB values.

interface ConditionRule {
  patterns: string[];
  key: string;
}

const CONDITION_RULES: ConditionRule[] = [
  { key: 'wifi',         patterns: ['wifi', 'wi-fi', 'wi fi', 'internet'] },
  { key: 'ac',           patterns: ['with ac', 'air condition', 'air-condition', 'air conditioned', 'airconditioned', 'aircondition'] },
  { key: 'parking',      patterns: ['parking', 'car park', 'bike park'] },
  { key: 'veg',          patterns: ['vegetarian', ' veg ', 'pure veg', 'veg food', 'veg only'] },
  { key: 'non-veg',      patterns: ['non-veg', 'nonveg', 'non veg', 'chicken', 'meat'] },
  { key: 'girls',        patterns: ['girls', 'for girls', 'girls only', 'ladies', 'female', 'women'] },
  { key: 'boys',         patterns: ['boys', 'for boys', 'boys only', 'gents', 'male only', 'men only'] },
  { key: 'trainer',      patterns: ['with trainer', 'personal trainer', 'trainer'] },
  { key: 'pool',         patterns: ['swimming pool', 'with pool', 'pool'] },
  { key: 'meals',        patterns: ['meals included', 'food included', 'with meals', 'with food', 'breakfast included'] },
  { key: '24hours',      patterns: ['24 hours', '24hr', '24/7', 'open 24', 'round the clock'] },
  { key: 'delivery',     patterns: ['delivery', 'home delivery'] },
  { key: 'takeaway',     patterns: ['takeaway', 'take away', 'takeout', 'take-away'] },
  { key: 'dine-in',      patterns: ['dine-in', 'dine in'] },
  { key: 'rooftop',      patterns: ['rooftop', 'roof top', 'terrace'] },
  { key: 'outdoor',      patterns: ['outdoor', 'open air', 'alfresco'] },
  { key: 'indoor',       patterns: ['indoor'] },
  { key: 'emergency',    patterns: ['emergency', 'urgent care'] },
  { key: 'dental',       patterns: ['dental', 'dentist'] },
  { key: 'pet-friendly', patterns: ['pet friendly', 'pets allowed', 'pet allowed'] },
  { key: 'cctv',         patterns: ['cctv', 'security camera', 'surveillance'] },
  { key: 'laundry',      patterns: ['laundry', 'washing'] },
  { key: 'hot-water',    patterns: ['hot water', 'geyser'] },
  { key: 'furnished',    patterns: ['furnished', 'fully furnished'] },
];

function detectConditions(query: string): string[] {
  const lower = query.toLowerCase();
  return CONDITION_RULES
    .filter(({ patterns }) => patterns.some((p) => lower.includes(p)))
    .map(({ key }) => key);
}

// ─── Condition checking ───────────────────────────────────────────────────────

type BizExt = Business & { area?: string; address?: string; landmark?: string };

function buildHaystack(b: BizExt): string {
  return [b.tags, b.amenities, b.description, b.vibe_tags, b.cuisine,
          JSON.stringify((b as BizExt & { custom_fields?: unknown }).custom_fields || {})]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function inHaystack(haystack: string, terms: string[]): boolean {
  return terms.some((t) => haystack.includes(t));
}

type ConditionChecker = (b: BizExt, h: string) => boolean;

const CONDITION_CHECKERS: Record<string, ConditionChecker> = {
  wifi:          (b, h) => b.wifi === true    || inHaystack(h, ['wifi', 'wi-fi']),
  ac:            (b, h) => b.ac === true      || inHaystack(h, ['ac', 'air condition', 'aircondition']),
  meals:         (_b, h) => inHaystack(h, ['meal', 'breakfast included', 'food included']),
  girls:         (b, h) => (b.gender || '').toLowerCase().includes('girl')
                          || (b.gender || '').toLowerCase().includes('female')
                          || inHaystack(h, ['girls', 'female', 'ladies', 'women']),
  boys:          (b, h) => (b.gender || '').toLowerCase().includes('boy')
                          || (b.gender || '').toLowerCase().includes('male')
                          || inHaystack(h, ['boys', 'gents', 'male']),
  trainer:       (_b, h) => inHaystack(h, ['trainer', 'personal trainer', 'coaching']),
  pool:          (_b, h) => inHaystack(h, ['pool', 'swimming']),
  parking:       (_b, h) => inHaystack(h, ['parking', 'car park', 'bike park']),
  veg:           (b, h) => (b.cuisine || '').toLowerCase().includes('veg')
                          || inHaystack(h, ['vegetarian', 'pure veg', ' veg ']),
  'non-veg':     (_b, h) => inHaystack(h, ['non-veg', 'nonveg', 'chicken', 'meat']),
  '24hours':     (b, h) => (b.opening_hours || '').includes('24')
                          || inHaystack(h, ['24 hour', '24hr', '24/7', 'round the clock']),
  delivery:      (_b, h) => inHaystack(h, ['delivery']),
  takeaway:      (_b, h) => inHaystack(h, ['takeaway', 'take away', 'takeout']),
  'dine-in':     (_b, h) => inHaystack(h, ['dine-in', 'dine in', 'dining']),
  rooftop:       (_b, h) => inHaystack(h, ['rooftop', 'roof top', 'terrace']),
  outdoor:       (_b, h) => inHaystack(h, ['outdoor', 'open air']),
  indoor:        (_b, h) => inHaystack(h, ['indoor']),
  emergency:     (_b, h) => inHaystack(h, ['emergency', 'urgent care']),
  dental:        (_b, h) => inHaystack(h, ['dental', 'dentist']),
  'pet-friendly':(_b, h) => inHaystack(h, ['pet friendly', 'pets allowed', 'pet allowed']),
  cctv:          (_b, h) => inHaystack(h, ['cctv', 'security camera', 'surveillance']),
  laundry:       (_b, h) => inHaystack(h, ['laundry', 'washing']),
  'hot-water':   (_b, h) => inHaystack(h, ['hot water', 'geyser']),
  furnished:     (_b, h) => inHaystack(h, ['furnished']),
};

function passesConditions(
  b: BizExt,
  conditions: string[],
  price: { max?: number; min?: number } | null
): boolean {
  if (price) {
    const pm = b.price_min != null ? Number(b.price_min) : null;
    if (pm == null) return false;
    if (price.max && pm > price.max) return false;
    if (price.min && pm < price.min) return false;
  }
  if (conditions.length > 0) {
    const h = buildHaystack(b);
    for (const key of conditions) {
      const check = CONDITION_CHECKERS[key];
      if (check && !check(b, h)) return false;
    }
  }
  return true;
}

// ─── Plan sorting ─────────────────────────────────────────────────────────────

// pro = highest priority; free = default; legacy values mapped to equivalent rank
const PLAN_ORDER: Record<string, number> = { pro: 0, plus: 0, free: 1, basic: 1 };

function byPlan(businesses: Business[]): Business[] {
  return [...businesses].sort((a, b) => {
    const ra = PLAN_ORDER[(a.plan || 'free').toLowerCase()] ?? 2;
    const rb = PLAN_ORDER[(b.plan || 'free').toLowerCase()] ?? 2;
    return ra - rb;
  });
}

// ─── DB fetch helpers ─────────────────────────────────────────────────────────

const SELECT_COLS =
  'id,name,category,city,area,description,photos,plan,opening_hours,' +
  'price_range,price_min,is_verified,tags,amenities,vibe_tags,cuisine,' +
  'wifi,ac,gender,custom_fields,phone,whatsapp,address,landmark';

/** ilike OR clause across text columns for a set of keywords. */
function keywordOrClause(keywords: string[]): string {
  const TEXT_COLS = ['name', 'description', 'city', 'area', 'tags'];
  const parts: string[] = [];
  for (const kw of keywords.slice(0, 12)) {
    const esc = kw.replace(/%/g, '\\%').replace(/_/g, '\\_');
    for (const col of TEXT_COLS) parts.push(`${col}.ilike.%${esc}%`);
  }
  return parts.join(',');
}

/** Client-side: does this business text contain any of the keywords? */
function matchesKeywords(b: BizExt, keywords: string[]): boolean {
  const hay = [b.name, b.area, b.description, b.tags, b.address, b.landmark]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return keywords.some((k) => hay.includes(k));
}

/**
 * Fetch all businesses in the given categories (+ optional city).
 * Keywords are applied client-side as a soft filter: if any match, prefer
 * those; otherwise return all in the category.
 */
async function fetchByCategory(
  client: ServiceClient,
  city: string | null,
  cats: string[],
  keywords: string[]
): Promise<Business[]> {
  let q = client
    .from('businesses')
    .select(SELECT_COLS)
    .or('is_active.eq.true,is_active.is.null')
    .not('category', 'in', `(${PROPERTY_CATEGORIES.join(',')})`);

  if (city) q = q.eq('city', city);
  if (cats.length === 1) q = q.eq('category', cats[0]);
  else                   q = q.in('category', cats);

  console.log('[fetchByCategory] city:', city, '| cats:', cats);
  const { data, error } = await q;
  console.log('[fetchByCategory] rows returned:', data?.length ?? 0, '| error:', error);
  if (data && data.length > 0) console.log('[fetchByCategory] first row category/city:', (data[0] as {category:string,city:string}).category, '/', (data[0] as {category:string,city:string}).city);
  if (error) { console.error('fetchByCategory error:', error); return []; }

  const all = ((data as unknown) as BizExt[]) || [];
  if (keywords.length === 0) return all;

  const matched = all.filter((b) => matchesKeywords(b, keywords));
  return matched.length > 0 ? matched : all; // soft: fall back to all if nothing matched
}

/**
 * Keyword ilike search across text columns.
 * Used when no category is detected.
 */
async function fetchByKeywords(
  client: ServiceClient,
  city: string | null,
  keywords: string[]
): Promise<Business[]> {
  if (keywords.length === 0) return [];

  let q = client
    .from('businesses')
    .select(SELECT_COLS)
    .or('is_active.eq.true,is_active.is.null')
    .not('category', 'in', `(${PROPERTY_CATEGORIES.join(',')})`);

  if (city) q = q.eq('city', city);

  const clause = keywordOrClause(keywords);
  if (clause) q = q.or(clause);

  const { data, error } = await q;
  if (error) { console.error('fetchByKeywords error:', error); return []; }
  return ((data as unknown) as Business[]) || [];
}

// ─── Related results ──────────────────────────────────────────────────────────
//
// Strips price and condition words from the query, then re-runs the search
// without those constraints. Used when the main search returns nothing.

const CONDITION_STRIP_PHRASES = [
  // Prices
  /(?:under|below|less\s+than)\s*(?:₹|rs\.?|rupees?)?\s*\d+(?:\.\d+)?k?/gi,
  /\b(?:cheap|budget|affordable)\b/gi,
  // Multi-word conditions (most specific first)
  'with personal trainer', 'personal trainer',
  'for girls only', 'girls only', 'for girls',
  'for boys only', 'boys only', 'for boys',
  'swimming pool', 'with pool',
  'meals included', 'food included', 'breakfast included', 'with meals', 'with food',
  'pet friendly', 'pets allowed', 'pet allowed',
  'fully furnished', 'with hot water', 'hot water',
  'air conditioned', 'air conditioning', 'air condition', 'with ac',
  'with wifi', 'with wi-fi', 'wi-fi', 'wi fi',
  'with parking', 'car park', 'bike park',
  'round the clock', 'open 24', '24 hours', '24/7',
  'home delivery', 'take away', 'take-away', 'takeout',
  'dine-in', 'dine in', 'open air', 'with rooftop', 'roof top',
  'with laundry', 'with cctv', 'security camera', 'urgent care',
  // Single-word conditions
  'with trainer', 'trainer', 'rooftop', 'outdoor', 'indoor',
  'emergency', 'dental', 'dentist', 'furnished', 'laundry', 'cctv',
  'wifi', 'parking', 'pool', '24hr', 'vegetarian', 'takeaway',
  'delivery', 'dining', 'geyser', 'non-veg', 'nonveg',
  'girls', 'boys', 'ladies', 'female', 'male', 'gents',
] as const;

export function stripConditions(query: string): string {
  let s = query.toLowerCase();
  for (const rule of CONDITION_STRIP_PHRASES) {
    if (rule instanceof RegExp) s = s.replace(rule, ' ');
    else                        s = s.split(rule).join(' ');
  }
  return s.replace(/\s{2,}/g, ' ').trim();
}

async function fetchRelated(
  client: ServiceClient,
  meta: DbMeta,
  cleanQuery: string,
  city: string | null
): Promise<Business[]> {
  const stripped = stripConditions(cleanQuery);
  const cats = detectCategories(stripped, meta.categories);
  const kws  = stripped
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));

  if (!cats && kws.length === 0) return [];

  let results: Business[];
  if (cats) {
    // Build keyword list excluding words that are already the category
    const catWords = new Set(cats.map((c) => c.toLowerCase()));
    const extraKws = kws.filter((w) => !catWords.has(w));
    results = await fetchByCategory(client, city, cats, extraKws);
  } else {
    results = await fetchByKeywords(client, city, kws);
  }
  return byPlan(results);
}

// ─── Typo fallback ────────────────────────────────────────────────────────────

function shortenLast(query: string, n: number): string {
  const parts = query.trim().split(/\s+/);
  const last  = parts[parts.length - 1];
  if (last.length - n < 3) return query; // don't shorten too far
  const shortened = last.slice(0, -n);
  return [...parts.slice(0, -1), shortened].join(' ');
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function searchBusinesses(
  query: string,
  cityFilter?: string,
  featured?: boolean
): Promise<{
  businesses: Business[];
  detectedCity: string | null;
  correctedQuery?: string;
  detectedPrice?: number | null;
  relatedResults?: Business[];
}> {
  const client = getServiceClient();

  if (featured) {
    const { data } = await client
      .from('businesses')
      .select(SELECT_COLS)
      .eq('is_active', true)
      .eq('featured', true)
      .not('category', 'in', `(${PROPERTY_CATEGORIES.join(',')})`);
    return { businesses: byPlan(((data as unknown) as Business[]) || []), detectedCity: null, detectedPrice: null };
  }

  // Load DB metadata (categories + cities) — cached
  const meta = await loadMeta(client);

  // ── Detect intent ──
  const detectedCity    = detectCity(query, meta.cities);
  const activeCity      = cityFilter || detectedCity;
  const priceCondition  = detectPriceCondition(query);
  const conditions      = detectConditions(query);
  const detectedPrice   = priceCondition?.detectedPrice ?? null;

  // Strip city from query so it doesn't pollute keyword matching
  let cleanQuery = query.trim();
  if (detectedCity) {
    cleanQuery = cleanQuery.replace(new RegExp(detectedCity, 'gi'), '').trim();
  }

  // Detect category slugs and remaining keywords
  const detectedCats = detectCategories(cleanQuery, meta.categories);

  // Keywords: words that are ≥2 chars, not stop words, not the detected category slug itself
  const catSlugSet = new Set((detectedCats || []).map((c) => c.toLowerCase()));
  const keywords = cleanQuery
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w) && !catSlugSet.has(w));

  console.log('[search] query:', query);
  console.log('[search] cleanQuery:', cleanQuery);
  console.log('[search] detectedCity:', detectedCity, '| activeCity:', activeCity);
  console.log('[search] detectedCats:', detectedCats);
  console.log('[search] keywords:', keywords);
  console.log('[search] meta.categories sample:', meta.categories.slice(0, 10));

  // ── Edge case: completely empty query ──
  if (!cleanQuery && !activeCity) {
    return { businesses: [], detectedCity, detectedPrice };
  }

  // ── Main fetch ──
  let businesses: Business[];

  if (detectedCats && detectedCats.length > 0) {
    businesses = await fetchByCategory(client, activeCity, detectedCats, keywords);
  } else if (keywords.length > 0) {
    businesses = await fetchByKeywords(client, activeCity, keywords);
  } else if (activeCity) {
    // Only a city was given — return all businesses in that city
    const { data } = await client
      .from('businesses')
      .select(SELECT_COLS)
      .or('is_active.eq.true,is_active.is.null')
      .not('category', 'in', `(${PROPERTY_CATEGORIES.join(',')})`)
      .eq('city', activeCity);
    businesses = ((data as unknown) as Business[]) || [];
  } else {
    return { businesses: [], detectedCity, detectedPrice };
  }

  // ── Price filter (hard) ──
  if (priceCondition) {
    const priceFiltered = businesses.filter((b) => passesConditions(b as BizExt, [], priceCondition));
    if (priceFiltered.length === 0) {
      const relatedResults = await fetchRelated(client, meta, cleanQuery, activeCity);
      return { businesses: [], detectedCity, detectedPrice, relatedResults };
    }
    businesses = priceFiltered;
  }

  // ── Condition filter (hard) ──
  if (conditions.length > 0) {
    const condFiltered = businesses.filter((b) => passesConditions(b as BizExt, conditions, null));
    if (condFiltered.length === 0) {
      const relatedResults = await fetchRelated(client, meta, cleanQuery, activeCity);
      return { businesses: [], detectedCity, detectedPrice, relatedResults };
    }
    businesses = condFiltered;
  }

  // ── Typo fallback ──
  let correctedQuery: string | undefined;
  if (businesses.length === 0 && cleanQuery.length >= 4) {
    for (const n of [2, 3]) {
      const short = shortenLast(cleanQuery, n);
      if (short === cleanQuery) continue;

      const shortCats = detectCategories(short, meta.categories);
      const shortKws  = short
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length >= 2 && !STOP_WORDS.has(w) && !(shortCats || []).map((c) => c.toLowerCase()).includes(w));

      let fallback: Business[];
      if (shortCats && shortCats.length > 0) {
        fallback = await fetchByCategory(client, activeCity, shortCats, shortKws);
      } else if (shortKws.length > 0) {
        fallback = await fetchByKeywords(client, activeCity, shortKws);
      } else continue;

      if (priceCondition) fallback = fallback.filter((b) => passesConditions(b as BizExt, [], priceCondition));
      if (conditions.length > 0) fallback = fallback.filter((b) => passesConditions(b as BizExt, conditions, null));

      if (fallback.length > 0) {
        businesses = fallback;
        correctedQuery = short;
        break;
      }
    }
  }

  // ── No results ──
  if (businesses.length === 0) {
    const relatedResults =
      conditions.length > 0 || priceCondition
        ? await fetchRelated(client, meta, cleanQuery, activeCity)
        : undefined;
    return { businesses: [], detectedCity, correctedQuery, detectedPrice, relatedResults };
  }

  return { businesses: byPlan(businesses), detectedCity, correctedQuery, detectedPrice };
}

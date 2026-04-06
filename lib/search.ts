import { getServiceClient } from './supabase';
import { Business } from '@/types';

export function generateSlug(name: string, city: string): string {
  return `${name}-${city}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// ─── Cities ───────────────────────────────────────────────────────────────────

const NAGALAND_CITIES = [
  'Kohima', 'Dimapur', 'Mokokchung', 'Wokha', 'Mon', 'Phek',
  'Tuensang', 'Zunheboto', 'Peren', 'Longleng', 'Kiphire',
  'Noklak', 'Shamator', 'Tseminyü', 'Chümoukedima', 'Niuland', 'Meluri',
];

export function detectCity(query: string): string | null {
  const lower = query.toLowerCase();
  for (const city of NAGALAND_CITIES) {
    if (lower.includes(city.toLowerCase())) return city;
  }
  return null;
}

// ─── Stop words ───────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'place', 'centre', 'center', 'find', 'near', 'best', 'good', 'around', 'nearby',
  'a', 'the', 'in', 'at', 'of', 'for', 'and', 'or', 'with', 'to', 'is', 'are',
  'was', 'were', 'i', 'me', 'my', 'we', 'our', 'some', 'any', 'where', 'which', 'want',
  'looking', 'search', 'show', 'get', 'list', 'need', 'want', 'give', 'please',
]);

// ─── Category detection ───────────────────────────────────────────────────────
//
// Maps query words → actual DB category slug(s) as stored in businesses.category.
// No display names — only the exact slugs the DB contains.

const CATEGORY_SYNONYMS: Record<string, string[]> = {
  cafe:        ['cafe'],
  cafes:       ['cafe'],
  café:        ['cafe'],
  cafés:       ['cafe'],
  coffee:      ['cafe'],
  pg:          ['pg', 'hostel'],
  hostel:      ['hostel', 'pg'],
  hostels:     ['hostel', 'pg'],
  restaurant:  ['restaurant'],
  restaurants: ['restaurant'],
  eatery:      ['restaurant'],
  dining:      ['restaurant'],
  gym:         ['gym'],
  gyms:        ['gym'],
  fitness:     ['gym'],
  turf:        ['turf'],
  turfs:       ['turf'],
  football:    ['turf'],
  cricket:     ['turf'],
  sports:      ['turf'],
  study:       ['study_space'],
  library:     ['study_space'],
  coworking:   ['study_space'],
  coaching:    ['coaching'],
  institute:   ['coaching'],
  academy:     ['coaching'],
  hotel:       ['hotel'],
  hotels:      ['hotel'],
  salon:       ['salon'],
  spa:         ['salon'],
  barbershop:  ['salon'],
  clinic:      ['clinic'],
  hospital:    ['hospital'],
  pharmacy:    ['pharmacy'],
  chemist:     ['pharmacy'],
  medical:     ['clinic', 'hospital', 'pharmacy'],
  shop:        ['shop'],
  store:       ['shop'],
  homestay:    ['homestay'],
  rental:      ['rental'],
  vehicle:     ['vehicle_rental'],
};

/**
 * Returns DB category slugs detected from the query.
 * Returns null if no category keyword found.
 */
function detectCategories(query: string): string[] | null {
  const lower = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  const words = lower.split(/\s+/).filter((w) => w.length >= 2);
  const slugs = new Set<string>();
  for (const word of words) {
    const cats = CATEGORY_SYNONYMS[word];
    if (cats) cats.forEach((c) => slugs.add(c));
  }
  return slugs.size > 0 ? [...slugs] : null;
}

// ─── Price detection ──────────────────────────────────────────────────────────

const CURRENCY_PAT = '(?:₹|rs\\.?|rupees?)?\\s*';
const AMOUNT_PAT = '(\\d+(?:\\.\\d+)?)(k)?';

function parseAmount(m: RegExpMatchArray): number {
  const num = parseFloat(m[1]);
  return m[2] === 'k' ? num * 1000 : num;
}

export function detectPriceCondition(query: string): { max?: number; min?: number; detectedPrice?: number } | null {
  const lower = query.toLowerCase();
  const underRe = new RegExp(`(?:under|below)\\s*${CURRENCY_PAT}${AMOUNT_PAT}`);
  const lessThanRe = new RegExp(`less\\s+than\\s*${CURRENCY_PAT}${AMOUNT_PAT}`);
  const m = lower.match(underRe) || lower.match(lessThanRe);
  if (m) {
    const max = parseAmount(m);
    return { max, detectedPrice: max };
  }
  if (lower.includes('cheap') || lower.includes('budget')) return { max: 500, detectedPrice: 500 };
  if (lower.includes('affordable')) return { max: 2000, detectedPrice: 2000 };
  return null;
}

// ─── Condition detection ──────────────────────────────────────────────────────

const CONDITION_TRIGGERS: Array<{ patterns: string[]; key: string }> = [
  { patterns: ['wifi', 'wi-fi', 'wi fi', 'internet'], key: 'wifi' },
  { patterns: ['ac ', ' ac', 'air condition', 'air-condition', 'air conditioned', 'aircondition'], key: 'ac' },
  { patterns: ['parking', 'car park', 'bike park'], key: 'parking' },
  { patterns: ['vegetarian', ' veg ', 'pure veg', 'veg food'], key: 'veg' },
  { patterns: ['non-veg', 'nonveg', 'non veg', 'chicken', 'meat'], key: 'non-veg' },
  // standalone 'girls' and 'boys' included — also catches multi-word phrases
  { patterns: ['girls', 'for girls', 'girls only', 'ladies', 'female', 'women'], key: 'girls' },
  { patterns: ['boys', 'for boys', 'boys only', 'gents', 'male only', 'men only'], key: 'boys' },
  { patterns: ['with trainer', 'personal trainer', 'trainer'], key: 'trainer' },
  { patterns: ['swimming pool', 'with pool', 'pool'], key: 'pool' },
  { patterns: ['meals included', 'food included', 'with meals', 'with food', 'breakfast included'], key: 'meals' },
  { patterns: ['24 hours', '24hr', '24/7', 'open 24', 'round the clock'], key: '24hours' },
  { patterns: ['delivery', 'home delivery', 'delivers'], key: 'delivery' },
  { patterns: ['takeaway', 'take away', 'takeout', 'take-away'], key: 'takeaway' },
  { patterns: ['dine-in', 'dine in'], key: 'dine-in' },
  { patterns: ['rooftop', 'roof top', 'terrace'], key: 'rooftop' },
  { patterns: ['outdoor', 'open air', 'alfresco'], key: 'outdoor' },
  { patterns: ['indoor'], key: 'indoor' },
  { patterns: ['emergency', 'urgent care'], key: 'emergency' },
  { patterns: ['dental', 'dentist'], key: 'dental' },
  { patterns: ['pet friendly', 'pets allowed', 'pet allowed'], key: 'pet-friendly' },
  { patterns: ['cctv', 'security camera', 'surveillance'], key: 'cctv' },
  { patterns: ['laundry', 'washing'], key: 'laundry' },
  { patterns: ['hot water', 'geyser'], key: 'hot-water' },
  { patterns: ['furnished', 'fully furnished'], key: 'furnished' },
];

function detectConditions(query: string): string[] {
  const lower = query.toLowerCase();
  return CONDITION_TRIGGERS
    .filter(({ patterns }) => patterns.some((p) => lower.includes(p)))
    .map(({ key }) => key);
}

// ─── Plan sorting ─────────────────────────────────────────────────────────────

const PLAN_RANK: Record<string, number> = { plus: 0, pro: 1, basic: 2 };

function sortByPlan(businesses: Business[]): Business[] {
  return [...businesses].sort((a, b) => {
    const rankA = PLAN_RANK[(a.plan || 'basic').toLowerCase()] ?? 3;
    const rankB = PLAN_RANK[(b.plan || 'basic').toLowerCase()] ?? 3;
    return rankA - rankB;
  });
}

// ─── Condition matching ───────────────────────────────────────────────────────

function buildHaystack(b: Business): string {
  return [
    b.tags, b.amenities, b.description, b.vibe_tags, b.cuisine,
    JSON.stringify((b as Business & { custom_fields?: unknown }).custom_fields || {}),
  ].filter(Boolean).join(' ').toLowerCase();
}

function haystackIncludes(haystack: string, terms: string[]): boolean {
  return terms.some((t) => haystack.includes(t.toLowerCase()));
}

const CONDITION_CHECKERS: Record<string, (b: Business, haystack: string) => boolean> = {
  wifi:          (b, h) => b.wifi === true || haystackIncludes(h, ['wifi', 'wi-fi']),
  ac:            (b, h) => b.ac === true   || haystackIncludes(h, ['ac', 'air condition', 'aircondition']),
  meals:         (b, h) => b.meals === true || haystackIncludes(h, ['meal', 'breakfast included', 'food included']),
  girls:         (b, h) => (b.gender || '').toLowerCase().includes('girl') || (b.gender || '').toLowerCase().includes('female') || haystackIncludes(h, ['girls', 'female', 'ladies', 'women']),
  boys:          (b, h) => (b.gender || '').toLowerCase().includes('boy')  || (b.gender || '').toLowerCase().includes('male')   || haystackIncludes(h, ['boys', 'gents', 'male']),
  trainer:       (_b, h) => haystackIncludes(h, ['trainer', 'personal trainer', 'coaching']),
  pool:          (_b, h) => haystackIncludes(h, ['pool', 'swimming']),
  parking:       (_b, h) => haystackIncludes(h, ['parking', 'car park', 'bike park']),
  veg:           (b, h) => (b.cuisine || '').toLowerCase().includes('veg') || haystackIncludes(h, ['vegetarian', 'pure veg', ' veg ']),
  'non-veg':     (_b, h) => haystackIncludes(h, ['non-veg', 'nonveg', 'chicken', 'meat']),
  '24hours':     (b, h) => (b.opening_hours || '').includes('24') || haystackIncludes(h, ['24 hour', '24hr', '24/7', 'round the clock']),
  delivery:      (_b, h) => haystackIncludes(h, ['delivery']),
  takeaway:      (_b, h) => haystackIncludes(h, ['takeaway', 'take away', 'takeout']),
  'dine-in':     (_b, h) => haystackIncludes(h, ['dine-in', 'dine in', 'dining']),
  rooftop:       (_b, h) => haystackIncludes(h, ['rooftop', 'roof top', 'terrace']),
  outdoor:       (_b, h) => haystackIncludes(h, ['outdoor', 'open air']),
  indoor:        (_b, h) => haystackIncludes(h, ['indoor']),
  emergency:     (_b, h) => haystackIncludes(h, ['emergency', 'urgent care']),
  dental:        (_b, h) => haystackIncludes(h, ['dental', 'dentist']),
  'pet-friendly':(_b, h) => haystackIncludes(h, ['pet friendly', 'pets allowed', 'pet allowed']),
  cctv:          (_b, h) => haystackIncludes(h, ['cctv', 'security camera', 'surveillance']),
  laundry:       (_b, h) => haystackIncludes(h, ['laundry', 'washing']),
  'hot-water':   (_b, h) => haystackIncludes(h, ['hot water', 'geyser']),
  furnished:     (_b, h) => haystackIncludes(h, ['furnished']),
};

function businessMatchesConditions(
  b: Business,
  conditions: string[],
  priceCondition: { max?: number; min?: number } | null
): boolean {
  if (priceCondition) {
    const priceMin = b.price_min != null ? Number(b.price_min) : null;
    if (priceMin == null) return false;
    if (priceCondition.max && priceMin > priceCondition.max) return false;
    if (priceCondition.min && priceMin < priceCondition.min) return false;
  }
  if (conditions.length > 0) {
    const haystack = buildHaystack(b);
    for (const condition of conditions) {
      const checker = CONDITION_CHECKERS[condition];
      if (checker && !checker(b, haystack)) return false;
    }
  }
  return true;
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

const BUSINESS_COLUMNS =
  'id,name,category,city,area,description,photos,plan,opening_hours,price_range,price_min,is_verified,tags,amenities,vibe_tags,cuisine,wifi,ac,meals,gender,custom_fields,phone,whatsapp,address,landmark';

/** Columns used for ilike keyword search (excludes category — handled by eq/in). */
const TEXT_SEARCH_COLUMNS = ['name', 'description', 'city', 'area', 'tags'];

function buildKeywordOrClause(keywords: string[]): string {
  const parts: string[] = [];
  for (const kw of keywords.slice(0, 15)) {
    const escaped = kw.replace(/%/g, '\\%').replace(/_/g, '\\_');
    const pat = `%${escaped}%`;
    for (const col of TEXT_SEARCH_COLUMNS) {
      parts.push(`${col}.ilike.${pat}`);
    }
  }
  return parts.join(',');
}

/**
 * Check if a business matches any of the given keywords in its text fields.
 * Used for client-side soft-filtering after a category fetch.
 */
type BusinessWithArea = Business & { area?: string; address?: string; landmark?: string };

function businessMatchesKeywords(b: Business, keywords: string[]): boolean {
  const bx = b as BusinessWithArea;
  const haystack = [b.name, bx.area, b.description, b.tags, bx.address, bx.landmark]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return keywords.some((kw) => haystack.includes(kw));
}

/**
 * Fetch businesses by category (exact DB slug match) + optional city.
 * Keywords are applied as a soft client-side post-filter:
 * if keyword matches exist, return those; otherwise return all in category.
 */
async function fetchByCategory(
  serviceClient: ReturnType<typeof getServiceClient>,
  activeCity: string | null,
  categorySlugs: string[],
  keywords: string[]
): Promise<Business[]> {
  let q = serviceClient
    .from('businesses')
    .select(BUSINESS_COLUMNS)
    .or('is_active.eq.true,is_active.is.null');

  if (activeCity) q = q.eq('city', activeCity);
  if (categorySlugs.length === 1) {
    q = q.eq('category', categorySlugs[0]);
  } else {
    q = q.in('category', categorySlugs);
  }

  const { data, error } = await q;
  if (error) {
    console.error('Category search error:', error);
    return [];
  }
  const all = (data as Business[]) || [];

  if (keywords.length === 0) return all;

  // Soft keyword filter: prefer matches but fall back to full set
  const matched = all.filter((b) => businessMatchesKeywords(b, keywords));
  return matched.length > 0 ? matched : all;
}

/**
 * Fetch businesses by keyword ilike search across text columns + optional city.
 * Used when no category is detected.
 */
async function fetchByKeywords(
  serviceClient: ReturnType<typeof getServiceClient>,
  activeCity: string | null,
  keywords: string[]
): Promise<Business[]> {
  if (keywords.length === 0) return [];

  let q = serviceClient
    .from('businesses')
    .select(BUSINESS_COLUMNS)
    .or('is_active.eq.true,is_active.is.null');

  if (activeCity) q = q.eq('city', activeCity);

  const orClause = buildKeywordOrClause(keywords);
  if (orClause) q = q.or(orClause);

  const { data, error } = await q;
  if (error) {
    console.error('Keyword search error:', error);
    return [];
  }
  return (data as Business[]) || [];
}

// ─── Related results ──────────────────────────────────────────────────────────

/**
 * Strip condition/price words from a query, leaving only category + location terms.
 * The result is used to build a "related results" fallback query.
 */
export function stripConditionsFromQuery(query: string): string {
  let result = query.toLowerCase();
  // Price patterns (including k suffix)
  result = result.replace(/(?:under|below|less\s+than)\s*(?:₹|rs\.?|rupees?)?\s*\d+(?:k)?/gi, ' ');
  result = result.replace(/\b(?:cheap|budget|affordable)\b/gi, ' ');
  // Multi-word condition phrases (most specific first)
  const phrases = [
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
    'dine-in', 'dine in', 'open air',
    'with rooftop', 'roof top',
    'with laundry', 'with cctv', 'security camera', 'urgent care',
    // Single-word conditions
    'with trainer', 'trainer', 'rooftop', 'outdoor', 'indoor',
    'emergency', 'dental', 'dentist', 'furnished', 'laundry', 'cctv',
    'wifi', 'parking', 'pool', '24hr', 'vegetarian', 'takeaway',
    'delivery', 'dining', 'geyser', 'non-veg', 'nonveg',
    'girls', 'boys', 'ladies', 'female', 'male', 'gents',
  ];
  for (const phrase of phrases) {
    result = result.split(phrase).join(' ');
  }
  return result.replace(/\s{2,}/g, ' ').trim();
}

async function fetchRelatedResults(
  serviceClient: ReturnType<typeof getServiceClient>,
  cleanQuery: string,
  activeCity: string | null
): Promise<Business[]> {
  const stripped = stripConditionsFromQuery(cleanQuery);
  const categorySlugs = detectCategories(stripped);
  const categoryTriggerWords = new Set(Object.keys(CATEGORY_SYNONYMS));

  const keywords = stripped
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w) && !categoryTriggerWords.has(w));

  if (!categorySlugs && keywords.length === 0) return [];

  let results: Business[];
  if (categorySlugs) {
    results = await fetchByCategory(serviceClient, activeCity, categorySlugs, keywords);
  } else {
    results = await fetchByKeywords(serviceClient, activeCity, keywords);
  }
  return sortByPlan(results);
}

// ─── Typo fallback ────────────────────────────────────────────────────────────

const MIN_QUERY_LEN = 4;
const MIN_WORD_LEN_AFTER_SHORTEN = 3;

function shortenSearchQuery(query: string, n: number): string {
  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY_LEN || n < 1) return trimmed;
  const parts = trimmed.split(/\s+/);
  const last = parts[parts.length - 1];
  if (last.length <= n || last.length - n < MIN_WORD_LEN_AFTER_SHORTEN) return trimmed;
  const shortened = last.slice(0, -n);
  return parts.length === 1 ? shortened : [...parts.slice(0, -1), shortened].join(' ');
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
  const serviceClient = getServiceClient();

  const detectedCity = detectCity(query);
  const activeCity = cityFilter || detectedCity;
  const priceCondition = detectPriceCondition(query);
  const conditions = detectConditions(query);
  const detectedPrice = priceCondition?.detectedPrice ?? null;

  // Strip city name from the search query
  let cleanQuery = query.trim();
  if (detectedCity) {
    cleanQuery = cleanQuery.replace(new RegExp(detectedCity, 'gi'), '').trim();
  }

  // Detect category and build keyword list
  const categorySlugs = detectCategories(cleanQuery);
  const categoryTriggerWords = new Set(Object.keys(CATEGORY_SYNONYMS));

  // Keywords: non-stop, non-category words used for soft/hard text matching
  const keywords = cleanQuery
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w) && !categoryTriggerWords.has(w));

  // ── Empty / trivial query ──
  if (!cleanQuery && !activeCity) {
    return { businesses: [], detectedCity, detectedPrice };
  }
  if (!cleanQuery && activeCity) {
    let q = serviceClient
      .from('businesses')
      .select(BUSINESS_COLUMNS)
      .or('is_active.eq.true,is_active.is.null')
      .eq('city', activeCity);
    const { data } = await q;
    return { businesses: sortByPlan((data as Business[]) || []), detectedCity, detectedPrice };
  }

  // ── Main fetch ──
  let businesses: Business[];
  if (categorySlugs) {
    businesses = await fetchByCategory(serviceClient, activeCity, categorySlugs, keywords);
  } else if (keywords.length > 0) {
    businesses = await fetchByKeywords(serviceClient, activeCity, keywords);
  } else {
    // Clean query has no usable terms after filtering — broad city-scoped fetch
    let q = serviceClient
      .from('businesses')
      .select(BUSINESS_COLUMNS)
      .or('is_active.eq.true,is_active.is.null');
    if (activeCity) q = q.eq('city', activeCity);
    const { data } = await q;
    businesses = (data as Business[]) || [];
  }

  // ── Price filter (hard) ──
  if (priceCondition) {
    const priceFiltered = businesses.filter((b) => businessMatchesConditions(b, [], priceCondition));
    if (priceFiltered.length === 0) {
      const relatedResults = await fetchRelatedResults(serviceClient, cleanQuery, activeCity);
      return { businesses: [], detectedCity, detectedPrice, relatedResults };
    }
    businesses = priceFiltered;
  }

  // ── Condition filter (hard) ──
  if (conditions.length > 0) {
    const conditionFiltered = businesses.filter((b) => businessMatchesConditions(b, conditions, null));
    if (conditionFiltered.length === 0) {
      const relatedResults = await fetchRelatedResults(serviceClient, cleanQuery, activeCity);
      return { businesses: [], detectedCity, detectedPrice, relatedResults };
    }
    businesses = conditionFiltered;
  }

  // ── Typo fallback ──
  let correctedQuery: string | undefined;
  if (businesses.length === 0 && keywords.length > 0 && cleanQuery.length >= MIN_QUERY_LEN) {
    for (const n of [2, 3]) {
      const shortened = shortenSearchQuery(cleanQuery, n);
      if (shortened === cleanQuery) continue;

      const shortCats = detectCategories(shortened);
      const shortKw = shortened
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length >= 2 && !STOP_WORDS.has(w) && !categoryTriggerWords.has(w));

      let fallback: Business[];
      if (shortCats) {
        fallback = await fetchByCategory(serviceClient, activeCity, shortCats, shortKw);
      } else if (shortKw.length > 0) {
        fallback = await fetchByKeywords(serviceClient, activeCity, shortKw);
      } else {
        continue;
      }

      if (priceCondition) fallback = fallback.filter((b) => businessMatchesConditions(b, [], priceCondition));
      if (conditions.length > 0) fallback = fallback.filter((b) => businessMatchesConditions(b, conditions, null));

      if (fallback.length > 0) {
        businesses = fallback;
        correctedQuery = shortened;
        break;
      }
    }
  }

  // ── No results ──
  if (businesses.length === 0) {
    const hadConditionsOrPrice = conditions.length > 0 || priceCondition !== null;
    const relatedResults = hadConditionsOrPrice
      ? await fetchRelatedResults(serviceClient, cleanQuery, activeCity)
      : undefined;
    return { businesses: [], detectedCity, correctedQuery, detectedPrice, relatedResults };
  }

  return { businesses: sortByPlan(businesses), detectedCity, correctedQuery, detectedPrice };
}

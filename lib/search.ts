import Anthropic from '@anthropic-ai/sdk';
import { getServiceClient } from './supabase';
import { Business } from '@/types';

export function generateSlug(name: string, city: string): string {
  return `${name}-${city}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const NAGALAND_CITIES = [
  'Kohima','Dimapur','Mokokchung','Wokha','Mon','Phek',
  'Tuensang','Zunheboto','Peren','Longleng','Kiphire',
  'Noklak','Shamator','Tseminyü','Chümoukedima','Niuland','Meluri'
];

const STOP_WORDS = new Set([
  'place','centre','center','find','near','best','good',
  'a','the','in','at','of','for','and','or','with','to','is','are',
  'was','were','i','me','my','we','our','some','any','where','which','want'
]);

/** Exact category names as stored in Supabase. */
const SUPABASE_CATEGORIES = [
  'Cafés',
  'PG & Hostels',
  'Restaurants',
  'Study Spaces',
  'Gyms',
  'Turfs & Sports',
  'shop',
] as const;

/** Normalize for comparison: lowercase, strip accents (e.g. Cafés → cafes). */
function normalizeCategory(cat: string): string {
  return (cat || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim();
}

/** Search trigger words → intent key → allowed Supabase category names. */
const CATEGORY_INTENT: Record<string, readonly string[]> = {
  cafe: ['Cafés'],
  pg: ['PG & Hostels'],
  restaurant: ['Restaurants'],
  study: ['Study Spaces'],
  gym: ['Gyms'],
  turf: ['Turfs & Sports'],
  shop: ['shop'],
};
const CATEGORY_TRIGGERS: Record<string, string> = {
  cafe: 'cafe',
  cafes: 'cafe',
  café: 'cafe',
  cafés: 'cafe',
  pg: 'pg',
  hostel: 'pg',
  hostels: 'pg',
  restaurant: 'restaurant',
  restaurants: 'restaurant',
  food: 'restaurant',
  study: 'study',
  library: 'study',
  coworking: 'study',
  gym: 'gym',
  gyms: 'gym',
  fitness: 'gym',
  turf: 'turf',
  turfs: 'turf',
  sports: 'turf',
  football: 'turf',
  shop: 'shop',
  shops: 'shop',
};

function getCategoryIntent(query: string): string[] | null {
  const words = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
  let intent: string | null = null;
  for (const w of words) {
    const t = CATEGORY_TRIGGERS[w];
    if (t) {
      intent = t;
      break;
    }
  }
  if (!intent || !CATEGORY_INTENT[intent]) return null;
  return [...CATEGORY_INTENT[intent]];
}

/** Only apply category filter when query is an exact category keyword; e.g. "football" skips filter so Fut-Tribe shows. */
const CATEGORY_FILTER_KEYWORDS = ['cafe', 'cafes', 'restaurant', 'restaurants', 'pg', 'hostel', 'hostels', 'gym', 'gyms', 'turf', 'turfs', 'study', 'hotel', 'hotels'];

function filterByCategoryIntent(candidates: Business[], allowedCategoryNames: string[]): Business[] {
  const allowedNormalized = new Set(allowedCategoryNames.map(normalizeCategory));
  return candidates.filter((b) => {
    const norm = normalizeCategory(b.category || '');
    return norm.length > 0 && allowedNormalized.has(norm);
  });
}

/** Plus first, then Pro, then Basic. */
const PLAN_RANK: Record<string, number> = { plus: 0, pro: 1, basic: 2 };

function sortByPlan(businesses: Business[]): Business[] {
  return [...businesses].sort((a, b) => {
    const planA = (a.plan || 'basic').toString().toLowerCase();
    const planB = (b.plan || 'basic').toString().toLowerCase();
    const rankA = PLAN_RANK[planA] ?? 3;
    const rankB = PLAN_RANK[planB] ?? 3;
    return rankA - rankB;
  });
}

function detectPriceCondition(query: string): { max?: number; min?: number } | null {
  const lower = query.toLowerCase();
  if (lower.match(/under\s*₹?\s*(\d+)/)) {
    const m = lower.match(/under\s*₹?\s*(\d+)/);
    return { max: parseInt(m![1]) };
  }
  if (lower.match(/below\s*₹?\s*(\d+)/)) {
    const m = lower.match(/below\s*₹?\s*(\d+)/);
    return { max: parseInt(m![1]) };
  }
  if (lower.match(/less than\s*₹?\s*(\d+)/)) {
    const m = lower.match(/less than\s*₹?\s*(\d+)/);
    return { max: parseInt(m![1]) };
  }
  if (lower.includes('cheap') || lower.includes('budget')) return { max: 500 };
  if (lower.includes('affordable')) return { max: 2000 };
  return null;
}

function detectConditions(query: string): string[] {
  const conditions: string[] = [];
  const lower = query.toLowerCase();
  const conditionMap: Record<string, string> = {
    'veg': 'veg', 'vegetarian': 'veg', 'non-veg': 'non-veg', 'nonveg': 'non-veg',
    'ac': 'AC', 'air condition': 'AC',
    'wifi': 'WiFi', 'wi-fi': 'WiFi',
    'parking': 'parking',
    'delivery': 'delivery',
    'boys': 'boys', 'girls': 'girls',
    'dental': 'dental', 'eye': 'eye', 'ortho': 'ortho',
    '24': '24 hours', '24hr': '24 hours', '24 hour': '24 hours',
    'emergency': 'emergency',
    'meals': 'meals included', 'food included': 'meals included',
    'dine': 'dine-in', 'dine-in': 'dine-in',
    'takeaway': 'takeaway',
    'indoor': 'indoor', 'outdoor': 'outdoor',
  };
  for (const [keyword, condition] of Object.entries(conditionMap)) {
    if (lower.includes(keyword)) conditions.push(condition);
  }
  return conditions;
}

function businessMatchesConditions(b: Business & { custom_fields?: Record<string, unknown> }, conditions: string[], priceCondition: { max?: number; min?: number } | null): boolean {
  const cf = b.custom_fields || {};
  const allText = JSON.stringify(cf).toLowerCase();

  if (priceCondition) {
    const prices = [
      cf.price_per_month, cf.price_per_night, cf.price_per_hour, cf.price_per_day
    ].filter(Boolean).map(Number);
    if (prices.length > 0) {
      if (priceCondition.max && !prices.some(p => p <= priceCondition.max!)) return false;
      if (priceCondition.min && !prices.some(p => p >= priceCondition.min!)) return false;
    }
  }

  for (const condition of conditions) {
    if (!allText.includes(condition.toLowerCase())) return false;
  }

  return true;
}

export function detectCity(query: string): string | null {
  const lower = query.toLowerCase();
  for (const city of NAGALAND_CITIES) {
    if (lower.includes(city.toLowerCase())) return city;
  }
  return null;
}

interface AiRankedResult {
  id: string;
  reason: string;
}

/** Re-order within each plan tier by Claude's relevance order; preserve Plus > Pro > Basic. */
function applyAiRankWithinPlanTiers(
  planSorted: Business[],
  claudeRanked: AiRankedResult[]
): Business[] {
  const claudeOrder = claudeRanked.map((r) => r.id);
  const byPlan: { plus: Business[]; pro: Business[]; basic: Business[] } = {
    plus: [],
    pro: [],
    basic: [],
  };
  for (const b of planSorted) {
    const p = (b.plan || 'basic').toString().toLowerCase();
    if (p === 'plus') byPlan.plus.push(b);
    else if (p === 'pro') byPlan.pro.push(b);
    else byPlan.basic.push(b);
  }
  const reorderWithinTier = (tier: Business[]): Business[] =>
    [...tier].sort((a, b) => {
      const ia = claudeOrder.indexOf(a.id);
      const ib = claudeOrder.indexOf(b.id);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  return [
    ...reorderWithinTier(byPlan.plus),
    ...reorderWithinTier(byPlan.pro),
    ...reorderWithinTier(byPlan.basic),
  ];
}

async function aiRankWithClaude(
  query: string,
  businesses: Business[]
): Promise<{ ranked: AiRankedResult[]; summary: string } | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('ANTHROPIC_API_KEY not set — skipping AI ranking');
    return null;
  }

  const businessList = businesses.map((b) => ({
    id: b.id,
    name: b.name,
    category: b.category,
    plan: (b.plan || 'basic').toString().toLowerCase(),
    description: (b.description || '').slice(0, 300),
  }));

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: 'You are Yana AI for Nagaland. You must FILTER first: remove any business that is clearly irrelevant to the search query (e.g. if the user searched "cafe", remove sports shops, PG hostels, clothing stores—only keep cafes, restaurants, food places). Then rank the REMAINING businesses by relevance within each plan tier (Plus first, then Pro, then Basic) and give each a short 4-6 word reason (e.g. "Good for dates", "Affordable near PR Hill"). Return ONLY the businesses that genuinely match the search intent. Return valid JSON only.',
      messages: [
        {
          role: 'user',
          content: `Search query: "${query}"

Businesses (id, name, category, plan, description):
${JSON.stringify(businessList, null, 2)}

Steps:
1. REMOVE businesses that do not match the search intent (e.g. for "cafe" remove sports shops, PG, unrelated categories).
2. Keep ONLY businesses that genuinely match (cafes, restaurants, food for "cafe"; gyms/fitness for "gym"; etc.).
3. Order the remaining by plan (Plus, then Pro, then Basic) and within each tier by relevance to the query.
4. For each kept business give a 4-6 word reason.

Return a JSON object:
- "summary": Brief 1-2 sentence overview of what you found (only for the relevant businesses).
- "ranked": Array of objects ONLY for businesses that match: { "id": "<uuid>", "reason": "4-6 word reason" }. Order: Plus (by relevance), then Pro (by relevance), then Basic (by relevance). Do NOT include any business that is irrelevant to the search.

Return ONLY valid JSON, no markdown.`,
        },
      ],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const ranked = Array.isArray(parsed.ranked) ? parsed.ranked : [];
      return {
        ranked: ranked.filter((r: { id?: string; reason?: string }) => r?.id && r?.reason),
        summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      };
    }
  } catch (error) {
    console.error('Claude AI ranking failed:', error);
  }

  return null;
}

const MIN_QUERY_LEN = 4;
const MIN_WORD_LEN_AFTER_SHORTEN = 3;

/** Shorten the last word of the query by n chars for typo fallback. */
function shortenSearchQuery(query: string, n: number): string {
  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY_LEN || n < 1) return trimmed;
  const parts = trimmed.split(/\s+/);
  const last = parts[parts.length - 1];
  if (last.length <= n || last.length - n < MIN_WORD_LEN_AFTER_SHORTEN) return trimmed;
  const shortened = last.slice(0, -n);
  if (parts.length === 1) return shortened;
  return [...parts.slice(0, -1), shortened].join(' ');
}

/** Plain text columns only — ilike does not work on array columns (tags, vibe_tags). */
const SEARCH_COLUMNS = ['name', 'category', 'description', 'city'];

function buildSearchOrClause(keywords: string[]): string {
  const parts: string[] = [];
  for (const kw of keywords.slice(0, 15)) {
    const escaped = kw.replace(/%/g, '\\%').replace(/_/g, '\\_');
    const pat = `%${escaped}%`;
    for (const col of SEARCH_COLUMNS) {
      parts.push(`${col}.ilike.${pat}`);
    }
  }
  return parts.join(',');
}

/** Run one Supabase query with optional text filter (ilike). Returns matching businesses only. */
async function fetchBusinessesWithFilter(
  serviceClient: ReturnType<typeof getServiceClient>,
  activeCity: string | null,
  keywords: string[]
): Promise<Business[]> {
  const isActiveFilter = 'is_active.eq.true,is_active.is.null';
  const businessColumns = 'id,name,slug,category,city,area,description,photos,plan,opening_hours,price_range,price_min,is_verified,verified,tags,vibe_tags,is_active,phone,whatsapp,address,landmark,email,created_at,updated_at';
  let q = serviceClient.from('businesses').select(businessColumns).or(isActiveFilter);
  if (activeCity) q = q.eq('city', activeCity);
  let orClause = '';
  if (keywords.length > 0) {
    orClause = buildSearchOrClause(keywords);
    if (orClause) q = q.or(orClause);
  }
  const { data, error } = await q;
  console.log('[search] Supabase query:', { keywords, orClause: orClause || '(none)', dataLength: data?.length ?? 0, error: error?.message ?? null });
  if (error) {
    console.error('Search query error:', error);
    return [];
  }
  return (data as Business[]) || [];
}

/** Filter a list of businesses by keyword match (same logic as main search). */
function filterByKeywords(pool: Business[], searchQuery: string): Business[] {
  const keywords = searchQuery.toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
  if (keywords.length === 0) return [];
  return pool.filter((b: Business) => {
    const haystack = [b.name, b.category, b.address, b.landmark, b.description, b.tags, JSON.stringify(b.custom_fields || {})]
      .filter(Boolean).join(' ').toLowerCase();
    return keywords.some(kw => haystack.includes(kw));
  });
}

export async function searchBusinesses(
  query: string,
  cityFilter?: string
): Promise<{ businesses: Business[]; detectedCity: string | null; correctedQuery?: string; aiSummary?: string; aiReasons?: Record<string, string> }> {
  const serviceClient = getServiceClient();

  const detectedCity = detectCity(query);
  const activeCity = cityFilter || detectedCity;
  const priceCondition = detectPriceCondition(query);
  const conditions = detectConditions(query);

  let cleanQuery = query.trim();
  if (detectedCity) cleanQuery = query.replace(new RegExp(detectedCity, 'gi'), '').trim();

  const keywords = cleanQuery.toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));

  const shouldFilterByCategory = CATEGORY_FILTER_KEYWORDS.includes(cleanQuery.toLowerCase().trim());

  let businesses: Business[];

  const businessColumns = 'id,name,slug,category,city,area,description,photos,plan,opening_hours,price_range,price_min,is_verified,verified,tags,vibe_tags,is_active,phone,whatsapp,address,landmark,email,created_at,updated_at';
  if (query.trim() === 'test123') {
    const { data } = await serviceClient.from('businesses').select(businessColumns).or('is_active.eq.true,is_active.is.null');
    businesses = (data as Business[]) || [];
    console.log('[search] test123: returning all businesses', businesses.length);
  } else if (cleanQuery.trim() === '') {
    const { data } = await serviceClient.from('businesses').select(businessColumns).or('is_active.eq.true,is_active.is.null');
    if (activeCity) {
      businesses = ((data as Business[]) || []).filter(b => b.city === activeCity);
    } else {
      businesses = (data as Business[]) || [];
    }
  } else if (keywords.length === 0) {
    const { data } = await serviceClient.from('businesses').select(businessColumns).or('is_active.eq.true,is_active.is.null');
    let all = (data as Business[]) || [];
    if (activeCity) all = all.filter(b => b.city === activeCity);
    const qLower = cleanQuery.toLowerCase();
    businesses = all.filter(
      (b) =>
        (b.name && b.name.toLowerCase().includes(qLower)) ||
        (b.category && b.category.toLowerCase().includes(qLower)) ||
        (b.description && b.description.toLowerCase().includes(qLower))
    );
    console.log('[search] Fallback (no keywords): query=', cleanQuery, 'results=', businesses.length);
  } else {
    // Keep original terms; add category synonyms (never replace — so "football" stays and we add "Turfs & Sports")
    const categoryIntent = getCategoryIntent(cleanQuery);
    const searchTerms = [...keywords];
    if (categoryIntent) {
      categoryIntent.forEach(cat => {
        if (!searchTerms.some(t => t.toLowerCase() === cat.toLowerCase())) searchTerms.push(cat);
      });
    }
    // Add individual words from original query (3+ chars, not already in array)
    const individualWords = cleanQuery.split(/\s+/).filter(w => w.length >= 3);
    individualWords.forEach(w => {
      if (!searchTerms.some(t => t.toLowerCase() === w.toLowerCase())) {
        searchTerms.push(w);
      }
    });
    businesses = await fetchBusinessesWithFilter(serviceClient, activeCity, searchTerms);
  }

  if (!businesses || businesses.length === 0) {
    if (cleanQuery.trim() === '') return { businesses: [], detectedCity };
  }

  let conditionFiltered = businesses || [];
  if (conditions.length > 0 || priceCondition) {
    const strict = businesses.filter(b => businessMatchesConditions(b, conditions, priceCondition));
    if (strict.length > 0) conditionFiltered = strict;
  }

  if (cleanQuery.trim() === '') {
    return { businesses: sortByPlan(conditionFiltered), detectedCity };
  }

  let candidates: Business[] = conditionFiltered;

  const categoryIntent = getCategoryIntent(cleanQuery);
  if (shouldFilterByCategory && categoryIntent && candidates.length > 0) {
    const categoryFiltered = filterByCategoryIntent(candidates, categoryIntent);
    if (categoryFiltered.length > 0) {
      candidates = categoryFiltered;
    }
  }

  let correctedQuery: string | undefined;
  if (candidates.length === 0 && keywords.length > 0 && cleanQuery.length >= MIN_QUERY_LEN) {
    const shortened2 = shortenSearchQuery(cleanQuery, 2);
    const shortened3 = shortenSearchQuery(cleanQuery, 3);
    const kw2 = shortened2.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));
    const kw3 = shortened3.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));
    if (shortened2 !== cleanQuery && kw2.length > 0) {
      const terms2 = [...kw2];
      if (categoryIntent) categoryIntent.forEach(cat => { if (!terms2.some(t => t.toLowerCase() === cat.toLowerCase())) terms2.push(cat); });
      const fallback = await fetchBusinessesWithFilter(serviceClient, activeCity, terms2);
      let filtered = fallback;
      if (conditions.length > 0 || priceCondition) {
        const strict = fallback.filter(b => businessMatchesConditions(b, conditions, priceCondition));
        if (strict.length > 0) filtered = strict;
      }
      const withIntent = shouldFilterByCategory && categoryIntent && filtered.length > 0 ? filterByCategoryIntent(filtered, categoryIntent) : filtered;
      if (withIntent.length > 0) {
        candidates = withIntent;
        correctedQuery = shortened2;
      }
    }
    if (candidates.length === 0 && shortened3 !== cleanQuery && shortened3 !== shortenSearchQuery(cleanQuery, 2) && kw3.length > 0) {
      const terms3 = [...kw3];
      if (categoryIntent) categoryIntent.forEach(cat => { if (!terms3.some(t => t.toLowerCase() === cat.toLowerCase())) terms3.push(cat); });
      const fallback = await fetchBusinessesWithFilter(serviceClient, activeCity, terms3);
      let filtered = fallback;
      if (conditions.length > 0 || priceCondition) {
        const strict = fallback.filter(b => businessMatchesConditions(b, conditions, priceCondition));
        if (strict.length > 0) filtered = strict;
      }
      const withIntent = shouldFilterByCategory && categoryIntent && filtered.length > 0 ? filterByCategoryIntent(filtered, categoryIntent) : filtered;
      if (withIntent.length > 0) {
        candidates = withIntent;
        correctedQuery = shortened3;
      }
    }
  }

  if (candidates.length === 0) {
    return { businesses: [], detectedCity, correctedQuery };
  }

  const sorted = sortByPlan(candidates);
  if (sorted.length === 0) {
    return { businesses: [], detectedCity, correctedQuery };
  }

  const aiResult = await aiRankWithClaude(query, sorted);

  if (aiResult && aiResult.ranked.length > 0) {
    const reasonMap: Record<string, string> = {};
    for (const r of aiResult.ranked) {
      if (r.id && r.reason) reasonMap[r.id] = r.reason;
    }
    const relevantIds = new Set(aiResult.ranked.map((r) => r.id));
    const onlyRelevant = sorted.filter((b) => relevantIds.has(b.id));
    const ordered = applyAiRankWithinPlanTiers(onlyRelevant, aiResult.ranked);
    return {
      businesses: ordered,
      detectedCity,
      correctedQuery,
      aiSummary: aiResult.summary,
      aiReasons: reasonMap,
    };
  }

  return { businesses: sorted, detectedCity, correctedQuery };
}

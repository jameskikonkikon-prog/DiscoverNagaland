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

const PLAN_RANK: Record<string, number> = { plus: 0, pro: 1, basic: 2 };

function sortByPlan(businesses: Business[]): Business[] {
  return [...businesses].sort((a, b) => {
    const rankA = PLAN_RANK[a.plan] ?? 3;
    const rankB = PLAN_RANK[b.plan] ?? 3;
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

async function aiRankWithClaude(
  query: string,
  businesses: Business[]
): Promise<{ ranked: AiRankedResult[]; summary: string } | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('ANTHROPIC_API_KEY not set — skipping AI ranking');
    return null;
  }

  const top15 = businesses.slice(0, 15);
  const businessList = top15.map((b) => ({
    id: b.id,
    name: b.name,
    category: b.category,
    city: b.city,
    address: b.address,
    description: b.description,
    tags: b.tags,
    amenities: b.amenities,
    price_range: b.price_range,
    gender: b.gender,
    vacancy: b.vacancy,
    wifi: b.wifi,
    ac: b.ac,
    meals: b.meals,
    vibe_tags: b.vibe_tags,
    custom_fields: b.custom_fields,
  }));

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: 'You are Yana AI, a helpful assistant for finding businesses in Nagaland. Rank these businesses by relevance to the user query and explain briefly why each is a good match. Be concise.',
      messages: [
        {
          role: 'user',
          content: `User searched: "${query}"

Here are the businesses found in our database:
${JSON.stringify(businessList, null, 2)}

Return a JSON object with:
1. "summary": A brief 1-2 sentence overview of what you found for the user
2. "ranked": An array of objects with "id" (business ID) and "reason" (one short sentence why it matches), ordered by relevance. Only include genuinely relevant businesses.

Return ONLY valid JSON, no markdown fences.`,
        },
      ],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        ranked: parsed.ranked || [],
        summary: parsed.summary || '',
      };
    }
  } catch (error) {
    console.error('Claude AI ranking failed:', error);
  }

  return null;
}

export async function searchBusinesses(
  query: string,
  cityFilter?: string
): Promise<{ businesses: Business[]; detectedCity: string | null; aiSummary?: string; aiReasons?: Record<string, string> }> {
  const serviceClient = getServiceClient();

  const detectedCity = detectCity(query);
  const activeCity = cityFilter || detectedCity;
  const priceCondition = detectPriceCondition(query);
  const conditions = detectConditions(query);

  let cleanQuery = query;
  if (detectedCity) cleanQuery = query.replace(new RegExp(detectedCity, 'gi'), '').trim();

  let dbQuery = serviceClient.from('businesses').select('*').eq('is_active', true);
  if (activeCity) dbQuery = dbQuery.eq('city', activeCity);

  const { data: businesses } = await dbQuery;
  if (!businesses || businesses.length === 0) {
    return { businesses: [], detectedCity };
  }

  // Apply condition filtering (soft — if it returns nothing, fall back to full set)
  let conditionFiltered = businesses;
  if (conditions.length > 0 || priceCondition) {
    const strict = businesses.filter(b => businessMatchesConditions(b, conditions, priceCondition));
    if (strict.length > 0) conditionFiltered = strict;
  }

  if (!cleanQuery.trim()) return { businesses: sortByPlan(conditionFiltered), detectedCity };

  // Keyword search across name, category, description, tags, address, custom_fields
  const keywords = cleanQuery.toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));

  let candidates = conditionFiltered;
  if (keywords.length > 0) {
    // First try: search within condition-filtered pool
    const keywordResults = conditionFiltered.filter((b: Business) => {
      const haystack = [b.name, b.category, b.address, b.landmark, b.description, b.tags, JSON.stringify(b.custom_fields || {})]
        .filter(Boolean).join(' ').toLowerCase();
      return keywords.some(kw => haystack.includes(kw));
    });
    if (keywordResults.length > 0) {
      candidates = keywordResults;
    } else {
      // Fallback: search across ALL businesses (ignore condition filter)
      const broadResults = businesses.filter((b: Business) => {
        const haystack = [b.name, b.category, b.address, b.landmark, b.description, b.tags, JSON.stringify(b.custom_fields || {})]
          .filter(Boolean).join(' ').toLowerCase();
        return keywords.some(kw => haystack.includes(kw));
      });
      if (broadResults.length > 0) {
        candidates = broadResults;
      }
    }
  }

  // AI ranking with Claude
  const sorted = sortByPlan(candidates);
  const aiResult = await aiRankWithClaude(query, sorted);

  if (aiResult && aiResult.ranked.length > 0) {
    const reasonMap: Record<string, string> = {};
    const aiOrderedIds = aiResult.ranked.map(r => {
      reasonMap[r.id] = r.reason;
      return r.id;
    });

    // Reorder by AI ranking, keeping AI-ranked ones first
    const aiRanked = aiOrderedIds
      .map(id => sorted.find(b => b.id === id))
      .filter(Boolean) as Business[];

    // Append any businesses AI didn't rank
    const rankedIds = new Set(aiOrderedIds);
    const remaining = sorted.filter(b => !rankedIds.has(b.id));

    return {
      businesses: [...aiRanked, ...remaining],
      detectedCity,
      aiSummary: aiResult.summary,
      aiReasons: reasonMap,
    };
  }

  return { businesses: sorted, detectedCity };
}

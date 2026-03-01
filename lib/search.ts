import { GoogleGenerativeAI } from '@google/generative-ai';
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
  'store','shop','place','centre','center','find','near','best','good',
  'a','the','in','at','of','for','and','or','with','to','is','are',
  'was','were','i','me','my','we','our','some','any','where','which','want'
]);

// Price condition detection
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

// Amenity/feature detection
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
    'football': 'football', 'cricket': 'cricket', 'badminton': 'badminton',
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

  // Check price
  if (priceCondition) {
    const prices = [
      cf.price_per_month, cf.price_per_night, cf.price_per_hour, cf.price_per_day
    ].filter(Boolean).map(Number);
    if (prices.length > 0) {
      if (priceCondition.max && !prices.some(p => p <= priceCondition.max!)) return false;
      if (priceCondition.min && !prices.some(p => p >= priceCondition.min!)) return false;
    }
  }

  // Check conditions
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

export async function searchBusinesses(
  query: string,
  cityFilter?: string
): Promise<{ businesses: Business[]; detectedCity: string | null }> {
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
  if (!businesses || businesses.length === 0) return { businesses: [], detectedCity };

  // Apply strict condition filtering first
  const conditionFiltered = (conditions.length > 0 || priceCondition)
    ? businesses.filter(b => businessMatchesConditions(b, conditions, priceCondition))
    : businesses;

  if (!cleanQuery.trim()) return { businesses: conditionFiltered, detectedCity };

  // Keyword search on condition-filtered results
  const keywords = cleanQuery.toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));

  if (keywords.length === 0) return { businesses: conditionFiltered, detectedCity };

  const keywordResults = conditionFiltered.filter((b: Business) => {
    const haystack = [b.name, b.category, b.address, b.landmark, b.description, b.tags, JSON.stringify(b.custom_fields || {})]
      .filter(Boolean).join(' ').toLowerCase();
    return keywords.some(kw => haystack.includes(kw));
  });

  if (keywordResults.length > 0) return { businesses: keywordResults, detectedCity };

  // Gemini fallback on condition-filtered pool
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const businessList = conditionFiltered.map((b: Business) => ({
      id: b.id, name: b.name, category: b.category, city: b.city,
      tags: b.tags, description: b.description, custom_fields: b.custom_fields,
    }));
    const prompt = `Local search for Nagaland, India.
Query: "${cleanQuery}"${activeCity ? ` in ${activeCity}` : ''}
These businesses already match the user's conditions. Rank them by relevance to the query.
Return JSON array of matching business IDs. Return [] if nothing relevant.
Businesses: ${JSON.stringify(businessList)}
Return ONLY: ["id1", "id2"]`;
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const match = text.match(/\[.*\]/s);
    if (match) {
      const ids = JSON.parse(match[0]) as string[];
      const geminiResults = ids.map(id => conditionFiltered.find((b: Business) => b.id === id)).filter(Boolean) as Business[];
      return { businesses: geminiResults, detectedCity };
    }
  } catch (error) {
    console.error('Gemini search failed:', error);
  }

  return { businesses: conditionFiltered, detectedCity };
}

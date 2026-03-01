import { GoogleGenerativeAI } from '@google/generative-ai';
import { getServiceClient } from './supabase';
import { Business } from '@/types';

export function generateSlug(name: string, city: string): string {
  return `${name}-${city}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const NAGALAND_CITIES = [
  'Kohima', 'Dimapur', 'Mokokchung', 'Wokha', 'Mon', 'Phek',
  'Tuensang', 'Zunheboto', 'Peren', 'Longleng', 'Kiphire',
  'Noklak', 'Shamator', 'Tseminyü', 'Chümoukedima', 'Niuland', 'Meluri'
];

const STOP_WORDS = new Set([
  'store','shop','place','centre','center','find','near','best','good',
  'a','the','in','at','of','for','and','or','with','to','is','are',
  'was','were','i','me','my','we','our','some','any','where','which'
]);

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

  // Strip city name from query
  let cleanQuery = query;
  if (detectedCity) {
    cleanQuery = query.replace(new RegExp(detectedCity, 'gi'), '').trim();
  }

  let dbQuery = serviceClient.from('businesses').select('*').eq('is_active', true);
  if (activeCity) dbQuery = dbQuery.eq('city', activeCity);

  const { data: businesses } = await dbQuery;

  if (!businesses || businesses.length === 0) return { businesses: [], detectedCity };
  if (!cleanQuery) return { businesses, detectedCity };

  // Break into keywords, ignore stop words
  const keywords = cleanQuery.toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));

  if (keywords.length === 0) return { businesses, detectedCity };

  // Match if ANY keyword found
  const keywordResults = businesses.filter((b: Business) => {
    const haystack = [b.name, b.category, b.address, b.landmark, b.description, b.tags]
      .filter(Boolean).join(' ').toLowerCase();
    return keywords.some(kw => haystack.includes(kw));
  });

  if (keywordResults.length > 0) return { businesses: keywordResults, detectedCity };

  // Gemini fallback
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const businessList = businesses.map((b: Business) => ({
      id: b.id, name: b.name, category: b.category, city: b.city,
      tags: b.tags, description: b.description,
      price_min: b.price_min, price_max: b.price_max,
    }));
    const prompt = `Local search for Nagaland, India.
Query: "${cleanQuery}"${activeCity ? ` in ${activeCity}` : ''}
Return JSON array of matching business IDs. Consider price ranges if mentioned.
Return [] if nothing matches.
Businesses: ${JSON.stringify(businessList)}
Return ONLY: ["id1", "id2"]`;
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const match = text.match(/\[.*\]/s);
    if (match) {
      const ids = JSON.parse(match[0]) as string[];
      const geminiResults = ids.map((id) => businesses.find((b: Business) => b.id === id)).filter(Boolean) as Business[];
      return { businesses: geminiResults, detectedCity };
    }
  } catch (error) {
    console.error('Gemini search failed:', error);
  }

  return { businesses: [], detectedCity };
}


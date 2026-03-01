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

  // Strip city name from query for better keyword matching
  let cleanQuery = query;
  if (detectedCity) {
    cleanQuery = query.replace(new RegExp(detectedCity, 'gi'), '').trim();
  }

  let dbQuery = serviceClient.from('businesses').select('*').eq('is_active', true);
  if (activeCity) dbQuery = dbQuery.eq('city', activeCity);

  const { data: businesses } = await dbQuery;

  if (!businesses || businesses.length === 0) {
    return { businesses: [], detectedCity };
  }

  if (!cleanQuery) {
    return { businesses, detectedCity };
  }

  const lowerQuery = cleanQuery.toLowerCase();

  const keywordResults = businesses.filter((b: Business) => {
    return (
      b.name?.toLowerCase().includes(lowerQuery) ||
      b.category?.toLowerCase().includes(lowerQuery) ||
      b.address?.toLowerCase().includes(lowerQuery) ||
      b.landmark?.toLowerCase().includes(lowerQuery) ||
      b.description?.toLowerCase().includes(lowerQuery) ||
      b.tags?.toLowerCase().includes(lowerQuery)
    );
  });

  if (keywordResults.length > 0) return { businesses: keywordResults, detectedCity };

  // Use Gemini for complex queries
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const businessList = businesses.map((b: Business) => ({
      id: b.id,
      name: b.name,
      category: b.category,
      city: b.city,
      tags: b.tags,
      description: b.description,
      price_min: b.price_min,
      price_max: b.price_max,
    }));

    const prompt = `You are a local search assistant for Nagaland, India.
User searched: "${cleanQuery}"${activeCity ? ` in ${activeCity}` : ''}
Return a JSON array of matching business IDs ordered by relevance.
Consider price ranges when mentioned (e.g. "under 500" means price_max <= 500).
Return [] if nothing matches.
Businesses: ${JSON.stringify(businessList)}
Return ONLY a JSON array like: ["id1", "id2"]`;

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

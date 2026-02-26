import { GoogleGenerativeAI } from '@google/generative-ai';
import { getServiceClient } from './supabase';
import { Business } from '@/types';
import crypto from 'crypto';

export function generateSlug(name: string, city: string): string {
  return `${name}-${city}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function searchBusinesses(query: string): Promise<Business[]> {
  const serviceClient = getServiceClient();
  const queryHash = crypto.createHash('md5').update(query.toLowerCase().trim()).digest('hex');

  // Check cache
  const { data: cached } = await serviceClient
    .from('search_logs')
    .select('*')
    .eq('query_hash', queryHash)
    .gt('cached_until', new Date().toISOString())
    .single();

  if (cached) {
    return cached.results as Business[];
  }

  // Get all active businesses
  const { data: businesses } = await serviceClient
    .from('businesses')
    .select('*')
    .eq('is_active', true)
    .order('plan', { ascending: false });

  if (!businesses || businesses.length === 0) return [];

  // Try keyword search first
  const lowerQuery = query.toLowerCase();
  const keywordResults = businesses.filter((b: Business) => {
    return (
      b.name.toLowerCase().includes(lowerQuery) ||
      b.category.toLowerCase().includes(lowerQuery) ||
      b.city.toLowerCase().includes(lowerQuery) ||
      b.address.toLowerCase().includes(lowerQuery) ||
      (b.landmark && b.landmark.toLowerCase().includes(lowerQuery)) ||
      (b.description && b.description.toLowerCase().includes(lowerQuery))
    );
  });

  if (keywordResults.length >= 3) {
    await cacheResults(queryHash, keywordResults, serviceClient);
    return keywordResults;
  }

  // Use Gemini for complex queries
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const businessList = businesses.map((b: Business) => ({
      id: b.id,
      name: b.name,
      category: b.category,
      city: b.city,
      landmark: b.landmark,
      description: b.description,
    }));

    const prompt = `You are a search engine for Nagaland, India. Given this search query: "${query}"
    
Find the most relevant businesses from this list. Return ONLY a JSON array of business IDs, ordered by relevance. Return empty array if nothing matches.

Businesses: ${JSON.stringify(businessList)}

Return format: ["id1", "id2", "id3"]`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const match = text.match(/\[.*\]/s);

    if (match) {
      const ids = JSON.parse(match[0]) as string[];
      const geminiResults = ids
        .map((id) => businesses.find((b: Business) => b.id === id))
        .filter(Boolean) as Business[];

      await cacheResults(queryHash, geminiResults, serviceClient);
      return geminiResults;
    }
  } catch (error) {
    console.error('Gemini search failed:', error);
  }

  await cacheResults(queryHash, keywordResults, serviceClient);
  return keywordResults;
}

async function cacheResults(queryHash: string, results: Business[], client: ReturnType<typeof getServiceClient>) {
  const cachedUntil = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
  await client.from('search_logs').upsert({
    query_hash: queryHash,
    results,
    cached_until: cachedUntil,
  });
}

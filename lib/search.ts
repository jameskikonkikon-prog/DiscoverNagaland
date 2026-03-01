import { GoogleGenerativeAI } from '@google/generative-ai';
import { getServiceClient } from './supabase';
import { Business } from '@/types';

export function generateSlug(name: string, city: string): string {
  return `${name}-${city}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function searchBusinesses(query: string): Promise<Business[]> {
  const serviceClient = getServiceClient();

  const { data: businesses } = await serviceClient
    .from('businesses')
    .select('*')
    .eq('is_active', true);

  if (!businesses || businesses.length === 0) return [];

  const lowerQuery = query.toLowerCase();

  const keywordResults = businesses.filter((b: Business) => {
    return (
      b.name?.toLowerCase().includes(lowerQuery) ||
      b.category?.toLowerCase().includes(lowerQuery) ||
      b.city?.toLowerCase().includes(lowerQuery) ||
      b.address?.toLowerCase().includes(lowerQuery) ||
      b.landmark?.toLowerCase().includes(lowerQuery) ||
      b.description?.toLowerCase().includes(lowerQuery) ||
      b.tags?.toLowerCase().includes(lowerQuery)
    );
  });

  if (keywordResults.length > 0) return keywordResults;

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
    }));

    const prompt = `You are a local search assistant for Nagaland, India.
User searched: "${query}"
Return a JSON array of matching business IDs ordered by relevance.
Return [] if nothing matches.
Businesses: ${JSON.stringify(businessList)}
Return ONLY a JSON array like: ["id1", "id2"]`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const match = text.match(/\[.*\]/s);
    if (match) {
      const ids = JSON.parse(match[0]) as string[];
      return ids.map((id) => businesses.find((b: Business) => b.id === id)).filter(Boolean) as Business[];
    }
  } catch (error) {
    console.error('Gemini search failed:', error);
  }

  return [];
}

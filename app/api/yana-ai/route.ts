export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function extractJSON(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  return raw.trim();
}

const STOP_WORDS = new Set([
  'a','an','the','in','at','of','for','and','or','with','to','is','are',
  'i','me','my','we','need','want','find','show','get','some','any',
  'where','which','what','how','can','you','please','looking','help',
]);

const CATEGORY_SYNONYMS: Record<string, string> = {
  cafe: 'Cafés', cafes: 'Cafés', café: 'Cafés', coffee: 'Cafés',
  restaurant: 'Restaurants', restaurants: 'Restaurants', food: 'Restaurants', eat: 'Restaurants', dining: 'Restaurants',
  pg: 'PG & Hostels', hostel: 'PG & Hostels', hostels: 'PG & Hostels', accommodation: 'PG & Hostels', stay: 'PG & Hostels', room: 'PG & Hostels',
  gym: 'Gyms', gyms: 'Gyms', fitness: 'Gyms', workout: 'Gyms',
  turf: 'Turfs & Sports', turfs: 'Turfs & Sports', sports: 'Turfs & Sports', football: 'Turfs & Sports', cricket: 'Turfs & Sports',
  study: 'Study Spaces', library: 'Study Spaces', coworking: 'Study Spaces', coaching: 'Study Spaces',
};

function extractKeywords(message: string): { keywords: string[]; category: string | null } {
  const words = message.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));
  let category: string | null = null;
  for (const w of words) {
    if (CATEGORY_SYNONYMS[w]) { category = CATEGORY_SYNONYMS[w]; break; }
  }
  return { keywords: words, category };
}

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    if (!message?.trim()) return NextResponse.json({ error: 'No message' }, { status: 400 });

    const { keywords, category } = extractKeywords(message);

    // Build OR filter: each keyword checked against name, description, address, category, city
    const searchTerms = category ? [...new Set([...keywords, category])] : keywords;
    const orParts = searchTerms.slice(0, 10).flatMap(kw => {
      const escaped = kw.replace(/%/g, '\\%').replace(/_/g, '\\_');
      return [
        `name.ilike.%${escaped}%`,
        `description.ilike.%${escaped}%`,
        `address.ilike.%${escaped}%`,
        `category.ilike.%${escaped}%`,
        `city.ilike.%${escaped}%`,
      ];
    });

    let results: { id: string; name: string; category: string; address: string; description: string; price_range: string; plan: string }[] | null = null;

    if (orParts.length > 0) {
      const { data } = await supabase
        .from('businesses')
        .select('id, name, category, address, description, price_range, plan')
        .or(orParts.join(','))
        .limit(5);
      results = data;
    }

    const resultCount = results?.length ?? 0;
    console.log('[yana-ai] message:', message);
    console.log('[yana-ai] keywords:', keywords, '| category:', category);
    console.log('[yana-ai] supabase results count:', resultCount);

    const zeroResultsNote = resultCount === 0
      ? `\n\nNOTE: No businesses were found in the database for this query. Do NOT say you lack database access. Instead say something like "I couldn't find exact matches on Yana right now, but you can browse ${category || 'relevant'} listings on the platform" and give 2-3 search chip suggestions.`
      : '';

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 400,
      system: 'You are Yana AI, a friendly local guide for Nagaland who knows every street. When someone asks to plan their day, create a real itinerary using the actual businesses provided. Format it naturally like: \'Start your morning at [Business Name] for breakfast, then head to [Place] around 11am...\' Be specific, warm and local. Always use real business names from the provided list. Never say you lack database access — always respond helpfully. End with 2-3 clickable search chips. Keep total response under 150 words. Respond ONLY in raw JSON: {"text": "your reply", "chips": ["query1", "query2", "query3"]}',
      messages: [{ role: 'user', content: `User asked: ${message}\n\nRelevant businesses found (${resultCount}): ${JSON.stringify(results ?? [])}${zeroResultsNote}` }],
    });

    console.log('[yana-ai] stop_reason:', response.stop_reason);
    if (response.stop_reason === 'max_tokens') {
      console.error('[yana-ai] response truncated by max_tokens');
    }

    const raw = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log('[yana-ai] raw response:', raw);

    const cleaned = extractJSON(raw);
    let data: { text?: string; chips?: unknown[] };
    try {
      data = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('[yana-ai] JSON parse failed:', parseErr, '| cleaned:', cleaned);
      return NextResponse.json({ text: 'I found some great spots for you! Try one of these searches:', chips: [] });
    }

    return NextResponse.json({ text: data.text ?? '', chips: Array.isArray(data.chips) ? data.chips.map(String) : [] });
  } catch (err) {
    console.error('[yana-ai] error:', err);
    return NextResponse.json({ error: 'Failed to get a response' }, { status: 500 });
  }
}

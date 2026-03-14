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

// --- Location detection ---
const NAGALAND_CITIES = [
  'Kohima','Dimapur','Mokokchung','Wokha','Mon','Phek',
  'Tuensang','Zunheboto','Peren','Longleng','Kiphire',
  'Noklak','Shamator','Tseminyü','Chümoukedima','Niuland','Meluri',
];

function detectLocation(message: string): string | null {
  const lower = message.toLowerCase();
  for (const city of NAGALAND_CITIES) {
    if (lower.includes(city.toLowerCase())) return city;
  }
  return null;
}

// --- Intent detection ---
type Intent = 'day_plan' | 'new_in_city' | 'medical' | 'food' | 'stay' | 'general';

function detectIntent(message: string): Intent {
  const lower = message.toLowerCase();
  if (/sick|ill|unwell|hospital|clinic|pharmacy|medicine|doctor|emergency|medical|hurt|pain/.test(lower)) return 'medical';
  if (/stay|accommodation|hotel|pg\b|hostel|room|rent|relocat|moved|moving|new here|just arrived/.test(lower)) return 'stay';
  if (/hungry|eat|food|lunch|dinner|breakfast|snack|restaurant|cafe|coffee/.test(lower)) return 'food';
  if (/new in|new to|just moved|relocat|settling|shifted/.test(lower)) return 'new_in_city';
  if (/plan.*day|day.*plan|tourist|tourism|visit|hangout|friends|explore|itinerary|trip|outing/.test(lower)) return 'day_plan';
  return 'general';
}

// --- Category fetch config per intent ---
type CategoryFetch = { category: string; limit: number };

const INTENT_CATEGORIES: Record<Intent, CategoryFetch[]> = {
  day_plan:    [{ category: 'Cafés', limit: 2 }, { category: 'Restaurants', limit: 2 }, { category: 'Turfs & Sports', limit: 2 }, { category: 'shop', limit: 2 }],
  new_in_city: [{ category: 'PG & Hostels', limit: 3 }, { category: 'Restaurants', limit: 2 }, { category: 'Study Spaces', limit: 2 }],
  medical:     [{ category: 'Hospitals', limit: 3 }, { category: 'Clinics', limit: 3 }, { category: 'Pharmacies', limit: 3 }],
  food:        [{ category: 'Restaurants', limit: 4 }, { category: 'Cafés', limit: 3 }],
  stay:        [{ category: 'PG & Hostels', limit: 4 }, { category: 'Hotels', limit: 3 }],
  general:     [{ category: 'Cafés', limit: 2 }, { category: 'Restaurants', limit: 2 }, { category: 'PG & Hostels', limit: 2 }, { category: 'Gyms', limit: 1 }, { category: 'Turfs & Sports', limit: 1 }],
};

type BizRow = { id: string; name: string; category: string; address: string; description: string; price_range: string; plan: string };

async function fetchByIntent(intent: Intent, location: string | null): Promise<BizRow[]> {
  const fetches = INTENT_CATEGORIES[intent];
  const results = await Promise.all(
    fetches.map(async ({ category, limit }) => {
      let q = supabase
        .from('businesses')
        .select('id, name, category, address, description, price_range, plan')
        .ilike('category', `%${category}%`)
        .limit(limit);
      if (location) q = q.ilike('city', `%${location}%`);
      const { data } = await q;
      return (data as BizRow[]) ?? [];
    })
  );

  // Merge, deduplicate by id, cap at 8
  const seen = new Set<string>();
  const merged: BizRow[] = [];
  for (const batch of results) {
    for (const biz of batch) {
      if (!seen.has(biz.id)) {
        seen.add(biz.id);
        merged.push(biz);
      }
    }
  }
  return merged.slice(0, 8);
}

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();
    if (!message?.trim()) return NextResponse.json({ error: 'No message' }, { status: 400 });
    const validHistory: { role: 'user' | 'assistant'; content: string }[] = Array.isArray(history)
      ? history.filter(h => (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string').slice(-4)
      : [];

    const location = detectLocation(message);
    const intent = detectIntent(message);
    const results = await fetchByIntent(intent, location);
    const resultCount = results.length;

    console.log('[yana-ai] message:', message);
    console.log('[yana-ai] intent:', intent, '| location:', location);
    console.log('[yana-ai] supabase results count:', resultCount);

    const zeroResultsNote = resultCount === 0
      ? `\n\nNOTE: No businesses found. Do NOT say you lack database access. Say "We are growing our listings in this area, browse more on Yana" and keep response helpful.`
      : '';

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 400,
      system: `You are Yana AI, a warm local guide for Nagaland. STRICT RULES:
1. ONLY recommend businesses from the provided list — never invent place names, landmarks, hospitals, pharmacies or attractions that are not in the list
2. Only recommend categories relevant to what the user is asking — do not suggest hospitals for a day plan or cafes when someone needs medical help
3. Always recommend a MIX of relevant businesses from the provided list
4. For general tips say things like 'explore local markets' or 'try Naga street food' without naming fake specific places
5. If listings are limited say: 'We are growing our listings in this area, browse more on Yana'
6. Keep response warm, specific, helpful and under 4 sentences
When mentioning a listed business, wrap it like: [BUSINESS:id:name] so the frontend can make it clickable.
Return JSON: {"text": "string"}`,
      messages: [
        ...validHistory,
        { role: 'user', content: `User asked: ${message}\n\nRelevant businesses found (${resultCount}): ${JSON.stringify(results)}${zeroResultsNote}` },
      ],
    });

    console.log('[yana-ai] stop_reason:', response.stop_reason);
    if (response.stop_reason === 'max_tokens') {
      console.error('[yana-ai] response truncated by max_tokens');
    }

    const raw = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log('[yana-ai] raw response:', raw);

    const cleaned = extractJSON(raw);
    let data: { text?: string };
    try {
      data = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('[yana-ai] JSON parse failed:', parseErr, '| cleaned:', cleaned);
      return NextResponse.json({ text: 'I found some great spots for you! Try searching on Yana Nagaland.' });
    }

    return NextResponse.json({ text: data.text ?? '' });
  } catch (err) {
    console.error('[yana-ai] error:', err);
    return NextResponse.json({ error: 'Failed to get a response' }, { status: 500 });
  }
}

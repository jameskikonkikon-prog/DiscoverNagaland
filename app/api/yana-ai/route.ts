export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { getServiceClient } from '@/lib/supabase';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DAILY_LIMIT = 10;
const COOKIE_NAME = 'yana_ai_id';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function getIdentifier(req: NextRequest): { identifier: string; newCookieId: string | null } {
  // 1. Logged-in business owner — Bearer JWT (decoded locally, no network call)
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    try {
      const payload = JSON.parse(Buffer.from(auth.split('.')[1], 'base64url').toString());
      if (payload.sub) return { identifier: `user:${payload.sub}`, newCookieId: null };
    } catch { /* fall through */ }
  }

  // 2. Returning anonymous visitor — existing yana_ai_id cookie
  const existing = req.cookies.get(COOKIE_NAME)?.value;
  if (existing) return { identifier: `anon:${existing}`, newCookieId: null };

  // 3. New anonymous visitor — generate a fresh ID and persist it as a cookie
  try {
    const newId = crypto.randomUUID();
    return { identifier: `anon:${newId}`, newCookieId: newId };
  } catch {
    // 4. Fallback: cookie generation failed — use IP address
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
      || req.headers.get('x-real-ip')
      || 'unknown';
    return { identifier: `ip:${ip}`, newCookieId: null };
  }
}

function withCookie(res: NextResponse, newCookieId: string | null): NextResponse {
  if (newCookieId) {
    res.cookies.set(COOKIE_NAME, newCookieId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    });
  }
  return res;
}

async function checkAndIncrement(identifier: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  const service = getServiceClient();

  console.log('[yana-ai] rate-limit identifier:', identifier, '| date:', today);

  const { data: existing, error: selectError } = await service
    .from('yana_ai_usage')
    .select('count')
    .eq('identifier', identifier)
    .eq('date', today)
    .maybeSingle();

  if (selectError) {
    console.error('[yana-ai] rate-limit SELECT error:', JSON.stringify(selectError));
  }

  const current = existing?.count ?? 0;
  console.log('[yana-ai] rate-limit current count:', current);

  if (current >= DAILY_LIMIT) {
    console.log('[yana-ai] rate-limit BLOCKED — limit reached for', identifier);
    return false;
  }

  const payload = { identifier, date: today, count: current + 1 };
  console.log('[yana-ai] rate-limit upsert payload:', JSON.stringify(payload));

  const { error: upsertError } = await service
    .from('yana_ai_usage')
    .upsert(payload, { onConflict: 'identifier,date' });

  if (upsertError) {
    console.error('[yana-ai] rate-limit UPSERT error:', JSON.stringify(upsertError));
    // Non-fatal: allow the request through even if tracking fails,
    // so a write bug does not break Yana AI for users.
  } else {
    console.log('[yana-ai] rate-limit upsert OK — count now:', current + 1);
  }

  return true;
}

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
    const { identifier, newCookieId } = getIdentifier(req);
    const allowed = await checkAndIncrement(identifier);
    if (!allowed) {
      return withCookie(
        NextResponse.json(
          { error: "You've reached today's Yana AI limit. Please try again tomorrow." },
          { status: 429 }
        ),
        newCookieId
      );
    }

    const { message, history } = await req.json();
    if (!message?.trim()) return withCookie(NextResponse.json({ error: 'No message' }, { status: 400 }), newCookieId);
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
      return withCookie(NextResponse.json({ error: 'Sorry, Yana is having trouble right now. Please try again in a bit.' }, { status: 500 }), newCookieId);
    }

    return withCookie(NextResponse.json({ text: data.text ?? '' }), newCookieId);
  } catch (err) {
    console.error('[yana-ai] error:', err);
    return NextResponse.json({ error: 'Failed to get a response' }, { status: 500 });
  }
}

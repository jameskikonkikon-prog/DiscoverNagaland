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

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    if (!message?.trim()) return NextResponse.json({ error: 'No message' }, { status: 400 });

    const { data: results } = await supabase
      .from('businesses')
      .select('id, name, category, address, description, price_range, plan')
      .ilike('description', `%${message}%`)
      .limit(5);

    console.log('[yana-ai] supabase results count:', results?.length ?? 0);
    console.log('[yana-ai] sending to anthropic — message:', message, '| businesses:', JSON.stringify(results ?? []));

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 400,
      system: 'You are Yana AI, a friendly local guide for Nagaland who knows every street. When someone asks to plan their day, create a real itinerary using the actual businesses provided. Format it naturally like: \'Start your morning at [Business Name] for breakfast, then head to [Place] around 11am...\' Be specific, warm and local. Always use real business names from the provided list. End with 2-3 clickable search chips for things they might want to explore more. Keep total response under 150 words. Respond ONLY in raw JSON: {"text": "itinerary string", "chips": ["query1", "query2", "query3"]}',
      messages: [{ role: 'user', content: `User asked: ${message}\n\nRelevant businesses: ${JSON.stringify(results ?? [])}` }],
    });

    console.log('[yana-ai] stop_reason:', response.stop_reason);
    const raw = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log('[yana-ai] raw response:', raw);

    if (response.stop_reason === 'max_tokens') {
      console.error('[yana-ai] response truncated by max_tokens');
    }

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

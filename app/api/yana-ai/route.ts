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

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 150,
      system: 'You are Yana AI, local guide for Nagaland. Based on the user message and these businesses from Yana Nagaland platform, give a warm helpful reply and suggest 2-3 search queries. Respond ONLY in raw JSON: {"text": "one sentence", "chips": ["query1", "query2"]}',
      messages: [{ role: 'user', content: `User asked: ${message}\n\nRelevant businesses: ${JSON.stringify(results ?? [])}` }],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text : '';
    const cleaned = extractJSON(raw);
    const data = JSON.parse(cleaned);

    return NextResponse.json({ text: data.text ?? '', chips: Array.isArray(data.chips) ? data.chips.map(String) : [] });
  } catch (err) {
    console.error('[yana-ai] error:', err);
    return NextResponse.json({ error: 'Failed to get a response' }, { status: 500 });
  }
}

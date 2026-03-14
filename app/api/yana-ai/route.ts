export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function extractJSON(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  return raw.trim();
}

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    if (!message?.trim()) return NextResponse.json({ error: 'No message' }, { status: 400 });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      system: 'You are Yana AI, a friendly local guide for Nagaland India. Respond ONLY with raw JSON, no markdown fences: {"text": "one helpful sentence", "chips": ["query1", "query2", "query3"]}',
      messages: [{ role: 'user', content: message }],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log('[yana-ai] text:', raw);

    const cleaned = extractJSON(raw);
    const data = JSON.parse(cleaned);

    const chips = Array.isArray(data.chips) ? data.chips.map(String) : [];

    return NextResponse.json({ text: data.text ?? '', chips });
  } catch (err) {
    console.error('[yana-ai] error:', err);
    return NextResponse.json({ error: 'Failed to get a response' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

function extractJSON(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  return raw.trim();
}

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    if (!message?.trim()) return NextResponse.json({ error: 'No message' }, { status: 400 });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const body = {
      contents: [{ parts: [{ text: message }] }],
      systemInstruction: {
        parts: [{ text: 'You are Yana AI, a friendly local guide for Nagaland India. Respond ONLY with raw JSON, no markdown fences: {"text": "one helpful sentence", "chips": ["query1", "query2", "query3"]}' }],
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    console.log('[yana-ai] gemini response status:', res.status);

    if (!res.ok) {
      console.error('[yana-ai] gemini error:', JSON.stringify(json));
      return NextResponse.json({ error: 'Gemini API error' }, { status: 500 });
    }

    const raw = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
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

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM = `You are Yana AI, a friendly local guide for Nagaland India. Based on the user's situation suggest 3-4 specific search queries for Yana Nagaland business directory. Respond only in JSON: {"text": string, "chips": string[]}`;

function extractJSON(raw: string): string {
  // Strip markdown code fences: ```json ... ``` or ``` ... ```
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  return raw.trim();
}

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    if (!message?.trim()) return NextResponse.json({ error: 'No message' }, { status: 400 });

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: SYSTEM,
    });

    const result = await model.generateContent(message);
    const raw = result.response.text();
    console.log('[yana-ai] raw response:', raw);

    const cleaned = extractJSON(raw);
    console.log('[yana-ai] cleaned:', cleaned);

    const data = JSON.parse(cleaned);

    // Ensure chips is always an array of strings
    const chips = Array.isArray(data.chips) ? data.chips.map(String) : [];

    return NextResponse.json({ text: data.text ?? '', chips });
  } catch (err) {
    console.error('[yana-ai] error:', err);
    return NextResponse.json({ error: 'Failed to get a response' }, { status: 500 });
  }
}

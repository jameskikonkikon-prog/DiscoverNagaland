export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM = `You are Yana AI, a friendly local guide for Nagaland India. Based on the user's situation suggest 3-4 specific search queries for Yana Nagaland business directory. Respond only in JSON: {"text": string, "chips": string[]}`;

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    if (!message?.trim()) return NextResponse.json({ error: 'No message' }, { status: 400 });

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: SYSTEM,
    });

    const result = await model.generateContent(message);
    const raw = result.response.text().trim();
    const cleaned = raw.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim();
    const data = JSON.parse(cleaned);
    return NextResponse.json(data);
  } catch (err) {
    console.error('yana-ai error:', err);
    return NextResponse.json({ error: 'Failed to get a response' }, { status: 500 });
  }
}

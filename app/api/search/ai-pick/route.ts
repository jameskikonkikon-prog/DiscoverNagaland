import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';

type BusinessInput = { id: string; name: string; category?: string; city?: string; description?: string };

/** POST /api/search/ai-pick — re-rank and filter results by occasion, area, budget; return ids + reasons. */
export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 });
  }

  let body: {
    query: string;
    occasion: string;
    area: string;
    budget: string;
    businesses: BusinessInput[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { query, occasion, area, budget, businesses } = body;
  if (!businesses || !Array.isArray(businesses) || businesses.length === 0) {
    return NextResponse.json({ ranked: [], summary: '' });
  }

  const list = businesses.slice(0, 30).map((b) => ({
    id: b.id,
    name: b.name,
    category: b.category || '',
    city: b.city || '',
    description: (b.description || '').slice(0, 250),
  }));

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: `You are Yana AI for Nagaland. The user has answered: Occasion = "${occasion}", Area = "${area}", Budget = "${budget}". Original search: "${query}".
Filter and re-rank the given businesses to only those that fit these preferences. Exclude businesses that clearly don't match (e.g. wrong area if they specified one, wrong budget tier). For each business you keep, write a short personalized reason (4-8 words) why it fits their choices.
Return ONLY valid JSON with: "ranked": array of { "id": "<uuid>", "reason": "short reason" } in order of best match first. Optionally "summary": one sentence. No markdown.`,
      messages: [
        {
          role: 'user',
          content: `Businesses:\n${JSON.stringify(list, null, 2)}\n\nReturn JSON: { "ranked": [ { "id": "...", "reason": "..." } ], "summary": "optional" }`,
        },
      ],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const ranked = Array.isArray(parsed.ranked)
        ? parsed.ranked.filter((r: { id?: string; reason?: string }) => r?.id && r?.reason)
        : [];
      const summary = typeof parsed.summary === 'string' ? parsed.summary : '';
      return NextResponse.json({ ranked, summary });
    }
  } catch (e) {
    console.error('AI pick error:', e);
    return NextResponse.json({ error: 'AI request failed' }, { status: 500 });
  }
  return NextResponse.json({ ranked: [], summary: '' });
}

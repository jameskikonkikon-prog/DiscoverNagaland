import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';

/** GET /api/search/occasions?q=cafe — returns context-appropriate occasion options from Claude. */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') || '';
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ occasions: [] }, { status: 200 });
  }

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      system: 'You are a helpful assistant for Yana Nagaland. Return only valid JSON. No markdown.',
      messages: [
        {
          role: 'user',
          content: `The user searched for: "${q}"

Generate 4-6 short occasion/use-case options that make sense for this type of search in Nagaland. Examples:
- For "cafe": Date night, Study, Hangout, Business meeting, Birthday
- For "gym": Weight loss, Build muscle, General fitness, Sports training
- For "turf": Casual game, Tournament, Practice, Team event
- For "PG" or "hostel": Student, Working professional, Short stay, Relocation

Return a JSON object with a single key "occasions" whose value is an array of strings. Each string is one option (2-4 words). Example: {"occasions": ["Date night", "Study", "Hangout"]}`,
        },
      ],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const occasions = Array.isArray(parsed.occasions)
        ? parsed.occasions.filter((o: unknown) => typeof o === 'string').slice(0, 8)
        : [];
      return NextResponse.json({ occasions });
    }
  } catch (e) {
    console.error('Occasions API error:', e);
  }
  return NextResponse.json({ occasions: [] });
}

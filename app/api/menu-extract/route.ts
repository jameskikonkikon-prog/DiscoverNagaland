export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' | 'application/pdf';

    const isImage = mediaType.startsWith('image/');
    const isPdf = mediaType === 'application/pdf';

    if (!isImage && !isPdf) {
      return NextResponse.json({ error: 'Only images and PDFs are supported' }, { status: 400 });
    }

    const contentBlock = isPdf
      ? { type: 'document' as const, source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: base64 } }
      : { type: 'image' as const, source: { type: 'base64' as const, media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif', data: base64 } };

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            contentBlock,
            {
              type: 'text',
              text: 'Extract all menu items from this menu. Return ONLY a JSON array with no markdown, no explanation. Each item must have: name (string), price (string, e.g. "₹80" or "80"), description (string, empty string if none). Example: [{"name":"Chicken Momo","price":"₹80","description":"Steamed dumplings with chicken filling"}]',
            },
          ],
        },
      ],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '[]';
    // Strip markdown code fences if present
    const cleaned = raw.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim();
    const items = JSON.parse(cleaned);
    return NextResponse.json({ items });
  } catch (err) {
    console.error('menu-extract error:', err);
    return NextResponse.json({ error: 'Failed to extract menu items' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { trackEvent } from '@/lib/supabase';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { event } = await request.json();
  try {
    await trackEvent(params.id, event);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Tracking failed' }, { status: 500 });
  }
}

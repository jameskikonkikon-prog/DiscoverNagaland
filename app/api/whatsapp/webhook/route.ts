export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? 'yana_verify';
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;

// ── GET: Meta webhook verification ─────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get('hub.mode');
  const token     = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// ── POST: Receive incoming messages ────────────────────────────────────────
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Meta always expects a 200 back quickly — process async
  processWebhook(body).catch(err =>
    console.error('[whatsapp/webhook] processing error:', err)
  );

  return NextResponse.json({ status: 'ok' });
}

// ── Async processing ────────────────────────────────────────────────────────
async function processWebhook(body: Record<string, unknown>) {
  const entry = (body.entry as unknown[])?.[0];
  if (!entry) return;

  const changes = ((entry as Record<string, unknown>).changes as unknown[])?.[0];
  if (!changes) return;

  const value = (changes as Record<string, unknown>).value as Record<string, unknown> | undefined;
  if (!value) return;

  const messages = value.messages as unknown[] | undefined;
  if (!messages?.length) return;

  const msg = messages[0] as Record<string, unknown>;
  const from    = msg.from    as string | undefined;
  const msgId   = msg.id      as string | undefined;
  const msgType = msg.type    as string | undefined;

  if (!from || !msgId) return;

  // Extract text
  const text =
    msgType === 'text'
      ? ((msg.text as Record<string, string> | undefined)?.body ?? '')
      : `[${msgType ?? 'unknown'}]`;

  // Persist to whatsapp_sessions
  const supabase = getServiceClient();
  await supabase.from('whatsapp_sessions').upsert(
    {
      phone:        from,
      last_message: text,
      last_message_id: msgId,
      updated_at:   new Date().toISOString(),
    },
    { onConflict: 'phone' }
  );

  // Send greeting reply
  await sendMessage(from, `Hi! 👋 Welcome to Yana Nagaland. How can we help you today?`);
}

// ── Send a WhatsApp message via Cloud API ───────────────────────────────────
async function sendMessage(to: string, message: string) {
  const url = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;
  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: message },
    }),
  });
}

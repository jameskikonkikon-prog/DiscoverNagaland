import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

const VALID_EVENTS = ['call', 'whatsapp', 'email', 'view'] as const
type EventType = typeof VALID_EVENTS[number]

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { business_id, property_id, event_type } = body

  if (!VALID_EVENTS.includes(event_type as EventType)) {
    return NextResponse.json({ error: 'Invalid event_type' }, { status: 400 })
  }

  const hasBiz = !!business_id
  const hasProp = !!property_id
  if (hasBiz === hasProp) {
    return NextResponse.json(
      { error: 'Provide exactly one of business_id or property_id' },
      { status: 400 }
    )
  }

  const supabase = getServiceClient()
  const { error } = await supabase.from('lead_events').insert({
    business_id: business_id ?? null,
    property_id: property_id ?? null,
    event_type,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

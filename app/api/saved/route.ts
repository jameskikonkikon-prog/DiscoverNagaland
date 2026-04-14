import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

async function getAuthedClient() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => list.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        ),
      },
    }
  )
  const { data: { session } } = await supabase.auth.getSession()
  return { supabase, session }
}

// GET /api/saved — list saved businesses + properties for the current user
export async function GET() {
  const { supabase, session } = await getAuthedClient()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('saved_items')
    .select(`
      id, created_at, business_id, property_id,
      businesses ( id, name, category, city, photos, phone, whatsapp, plan ),
      properties ( id, title, property_type, listing_type, city, locality, price, price_unit, photos )
    `)
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ saved: data ?? [] })
}

// POST /api/saved — save an item { business_id } or { property_id }
export async function POST(req: NextRequest) {
  const { supabase, session } = await getAuthedClient()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { business_id, property_id } = body as { business_id?: string; property_id?: string }

  if (!business_id && !property_id) {
    return NextResponse.json({ error: 'Provide business_id or property_id' }, { status: 400 })
  }

  const insert: Record<string, string> = { user_id: session.user.id }
  if (business_id) insert.business_id = business_id
  if (property_id) insert.property_id = property_id

  const { error } = await supabase.from('saved_items').insert(insert)
  if (error) {
    // 23505 = unique violation — already saved, treat as success
    if (error.code === '23505') return NextResponse.json({ ok: true, already: true })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// DELETE /api/saved?business_id=... or ?property_id=...
export async function DELETE(req: NextRequest) {
  const { supabase, session } = await getAuthedClient()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const business_id = searchParams.get('business_id')
  const property_id = searchParams.get('property_id')

  if (!business_id && !property_id) {
    return NextResponse.json({ error: 'Provide business_id or property_id' }, { status: 400 })
  }

  let query = supabase.from('saved_items').delete().eq('user_id', session.user.id)
  if (business_id) query = query.eq('business_id', business_id)
  else query = query.eq('property_id', property_id!)

  const { error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

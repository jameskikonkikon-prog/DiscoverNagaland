export const dynamic = 'force-dynamic'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

// GET /api/save-count
// Returns save counts for all listings owned by the authenticated user.
// Response: { businesses: { [id]: count }, properties: { [id]: count } }
export async function GET() {
  const cookieStore = await cookies()
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const svc = getServiceClient()

  // Fetch IDs of businesses owned by this user
  const { data: bizRows } = await svc
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .eq('is_active', true)

  // Fetch IDs of properties owned by this user
  const { data: propRows } = await svc
    .from('properties')
    .select('id')
    .eq('owner_id', user.id)

  const bizIds  = (bizRows  ?? []).map((r: { id: string }) => r.id)
  const propIds = (propRows ?? []).map((r: { id: string }) => r.id)

  const businesses: Record<string, number> = {}
  const properties: Record<string, number> = {}

  if (bizIds.length > 0) {
    const { data: rows } = await svc
      .from('saved_items')
      .select('business_id')
      .in('business_id', bizIds)

    for (const id of bizIds) businesses[id] = 0
    for (const row of rows ?? []) {
      if (row.business_id) businesses[row.business_id] = (businesses[row.business_id] ?? 0) + 1
    }
  }

  if (propIds.length > 0) {
    const { data: rows } = await svc
      .from('saved_items')
      .select('property_id')
      .in('property_id', propIds)

    for (const id of propIds) properties[id] = 0
    for (const row of rows ?? []) {
      if (row.property_id) properties[row.property_id] = (properties[row.property_id] ?? 0) + 1
    }
  }

  return NextResponse.json({ businesses, properties })
}

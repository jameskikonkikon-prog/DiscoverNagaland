import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('properties')
    .select('id,title,property_type,listing_type,city,locality,landmark,price,price_unit,area,area_unit,description,photos,posted_by_name,phone,whatsapp,is_available,last_verified_at')
    .eq('id', id)
    .eq('is_available', true)
    .gte('last_verified_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ property: data })
}

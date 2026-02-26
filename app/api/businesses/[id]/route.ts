import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const serviceClient = getServiceClient();
  const { data, error } = await serviceClient.from('businesses').select('*').eq('id', params.id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ business: data });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json();
  const serviceClient = getServiceClient();
  const { data, error } = await serviceClient
    .from('businesses')
    .update(body)
    .eq('id', params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ business: data });
}

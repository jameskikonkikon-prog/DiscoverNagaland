export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { searchBusinesses } from '@/lib/search';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');
  if (!query) return NextResponse.json({ businesses: [] });

  try {
    const businesses = await searchBusinesses(query);
    return NextResponse.json({ businesses });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ businesses: [], error: 'Search failed' }, { status: 500 });
  }
}

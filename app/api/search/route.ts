export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { searchBusinesses } from '@/lib/search';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q') || '';
  const city = request.nextUrl.searchParams.get('city') || '';
  const featured = request.nextUrl.searchParams.get('featured') === 'true';

  if (!query && !city && !featured) return NextResponse.json({ businesses: [], detectedCity: null, detectedPrice: null });

  try {
    const result = await searchBusinesses(query, city || undefined, featured);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ businesses: [], detectedCity: null, error: 'Search failed' }, { status: 500 });
  }
}

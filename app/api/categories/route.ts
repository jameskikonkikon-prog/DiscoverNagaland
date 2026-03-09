import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/** GET /api/categories — returns all unique category values from businesses table. */
export async function GET() {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('businesses')
      .select('id, category');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const list = data || [];
    const categories = [
      ...new Set(
        list.map((b) => (b.category ?? '').toString().trim()).filter((c) => c.length > 0)
      ),
    ].sort((a, b) => a.localeCompare(b, 'en'));

    return NextResponse.json({
      totalBusinesses: list.length,
      uniqueCategories: categories.length,
      categories,
    });
  } catch (e) {
    console.error('Categories API error:', e);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

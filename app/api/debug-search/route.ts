export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export async function GET() {
  const diagnostics: Record<string, unknown> = {};

  // 1. Check Supabase connection + list all businesses
  try {
    const client = getServiceClient();
    const { data, error, count } = await client
      .from('businesses')
      .select('id, name, category, city, is_active, plan, description, tags', { count: 'exact' });

    diagnostics.supabase_connected = !error;
    diagnostics.supabase_error = error?.message || null;
    diagnostics.total_businesses = count;
    diagnostics.businesses = data;

    // Also check active ones specifically
    const { data: active, count: activeCount } = await client
      .from('businesses')
      .select('id, name, category, city, description, tags', { count: 'exact' })
      .eq('is_active', true);

    diagnostics.active_businesses_count = activeCount;
    diagnostics.active_businesses = active;
  } catch (e) {
    diagnostics.supabase_error = String(e);
  }

  // 2. Check ANTHROPIC_API_KEY
  const apiKey = process.env.ANTHROPIC_API_KEY;
  diagnostics.anthropic_key_set = !!apiKey;
  diagnostics.anthropic_key_prefix = apiKey ? apiKey.slice(0, 10) + '...' : null;

  // 3. Test Claude API call
  if (apiKey) {
    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey });
      const msg = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 50,
        messages: [{ role: 'user', content: 'Say "Yana AI connected!" in exactly those words.' }],
      });
      const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
      diagnostics.claude_api_working = true;
      diagnostics.claude_response = text;
    } catch (e) {
      diagnostics.claude_api_working = false;
      diagnostics.claude_error = String(e);
    }
  }

  // 4. Simulate search for "football store"
  try {
    const query = 'football store';
    const lower = query.toLowerCase();
    const STOP_WORDS = new Set(['store','shop','place','centre','center','find','near','best','good','a','the','in','at','of','for','and','or','with','to','is','are','was','were','i','me','my','we','our','some','any','where','which','want']);
    const keywords = lower.split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));
    diagnostics.search_simulation = {
      query,
      keywords_after_stopword_removal: keywords,
      problem: keywords.length === 0 ? 'ALL KEYWORDS REMOVED BY STOP WORDS — this is the bug!' : 'Keywords survived',
      note: "'store' is in STOP_WORDS and 'football' is in STOP_WORDS (length check passes but detectConditions grabs it as amenity filter)',",
    };

    // Check if "football" triggers condition filter
    const conditionMap: Record<string, string> = { 'football': 'football' };
    const conditions: string[] = [];
    for (const [kw, cond] of Object.entries(conditionMap)) {
      if (lower.includes(kw)) conditions.push(cond);
    }
    diagnostics.search_simulation_conditions = {
      detected_conditions: conditions,
      problem: conditions.length > 0 ? '"football" triggers condition filter — requires custom_fields to contain "football", which a store won\'t have' : 'No condition detected',
    };
  } catch (e) {
    diagnostics.search_simulation_error = String(e);
  }

  return NextResponse.json(diagnostics, { status: 200 });
}

import { createClient } from '@supabase/supabase-js';

export function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Lazy singleton — safe during build when env vars aren't available
let _supabase: ReturnType<typeof createClient> | null = null;
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_, prop) {
    if (!_supabase) _supabase = getSupabaseClient();
    return (_supabase as Record<string, unknown>)[prop as string];
  },
});

export function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function trackEvent(
  businessId: string,
  event: 'profile_view' | 'whatsapp_click' | 'call_click' | 'maps_click' | 'search_appearance'
) {
  const today = new Date().toISOString().split('T')[0];
  const serviceClient = getServiceClient();
  const { data: existing } = await serviceClient
    .from('business_analytics')
    .select('*')
    .eq('business_id', businessId)
    .eq('date', today)
    .single();
  if (existing) {
    await serviceClient
      .from('business_analytics')
      .update({ [event]: (existing[event] || 0) + 1 })
      .eq('id', existing.id);
  } else {
    await serviceClient.from('business_analytics').insert({
      business_id: businessId,
      date: today,
      [event]: 1,
    });
  }
}

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import PropertyPageClient from './PropertyPageClient';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: p } = await supabase.from('properties').select('title,property_type,city,price,price_unit,photos').eq('id', params.id).single();
  if (!p) return {};
  const title = p.title;
  const priceStr = p.price ? `₹${Number(p.price).toLocaleString('en-IN')}${p.price_unit ? `/${p.price_unit}` : ''}` : '';
  const description = `${p.property_type} in ${p.city}${priceStr ? ` — ${priceStr}` : ''} · Listed on Yana Nagaland`;
  const image = p.photos?.[0];
  return {
    title,
    openGraph: { title, description, ...(image ? { images: [{ url: image }] } : {}) },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function PropertyPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const { data: property } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .eq('is_available', true)
    .single();

  if (!property) redirect('/real-estate');

  const isOwner = !!(session?.user?.id && property.owner_id && session.user.id === property.owner_id);
  const isLoggedIn = !!session;

  return (
    <PropertyPageClient
      property={property}
      isOwner={isOwner}
      isLoggedIn={isLoggedIn}
    />
  );
}

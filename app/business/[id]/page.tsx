import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import BusinessPageClient from './BusinessPageClient';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: biz } = await supabase.from('businesses').select('name,category,city,description,photos').eq('id', params.id).single();
  if (!biz) return {};
  const title = biz.name;
  const description = biz.description || `${biz.category} in ${biz.city} — listed on Yana Nagaland`;
  const image = biz.photos?.[0];
  return {
    title,
    openGraph: { title, description, ...(image ? { images: [{ url: image }] } : {}) },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function BusinessPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const { data: biz } = await supabase.from('businesses').select('*').eq('id', id).single();

  if (!biz) redirect('/');

  const { data: reviews } = await supabase
    .from('reviews')
    .select('*')
    .eq('business_id', id)
    .order('created_at', { ascending: false });

  const isOwner = !!(session?.user?.id && biz.owner_id && session.user.id === biz.owner_id);
  const isLoggedIn = !!session;

  return (
    <BusinessPageClient
      biz={biz}
      initialReviews={reviews || []}
      isOwner={isOwner}
      isLoggedIn={isLoggedIn}
    />
  );
}

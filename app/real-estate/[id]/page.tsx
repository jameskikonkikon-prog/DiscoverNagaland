import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import PropertyPageClient from './PropertyPageClient';

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

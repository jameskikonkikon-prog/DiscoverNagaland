import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
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

    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/reset-password`);
      }

      const userId = data.user.id;

      const serviceClient = getServiceClient();
      const [{ count: bizCount }, { count: propCount }] = await Promise.all([
        serviceClient.from('businesses').select('id', { count: 'exact', head: true }).eq('owner_id', userId),
        serviceClient.from('properties').select('id', { count: 'exact', head: true }).eq('owner_id', userId),
      ]);

      const hasBiz = (bizCount ?? 0) > 0;
      const hasProp = (propCount ?? 0) > 0;

      let destination = '/account';
      if (hasBiz && !hasProp) destination = '/dashboard';
      else if (hasProp && !hasBiz) destination = '/real-estate/dashboard';

      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}

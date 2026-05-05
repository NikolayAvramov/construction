import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabasePublicEnv } from "@/utils/supabase/env";

/**
 * Next.js App Router + Supabase Auth (SSR).
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
type CookieStore = Awaited<ReturnType<typeof cookies>>;

function createServerClientWithCookies(cookieStore: CookieStore): SupabaseClient {
  const { url, key } = supabasePublicEnv();
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Component — middleware session refresh handles cookies.
        }
      },
    },
  });
}

/** С `cookieStore` от `await cookies()` — като официалния Supabase Next.js пример. */
export function createClient(cookieStore: CookieStore): SupabaseClient;

/** Без аргумент — вика `cookies()` вътрешно. */
export function createClient(): Promise<SupabaseClient>;

export function createClient(
  cookieStore?: CookieStore
): SupabaseClient | Promise<SupabaseClient> {
  if (cookieStore) {
    return createServerClientWithCookies(cookieStore);
  }
  return cookies().then((store) => createServerClientWithCookies(store));
}

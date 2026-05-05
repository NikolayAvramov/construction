import { createBrowserClient } from "@supabase/ssr";
import { supabasePublicEnv } from "@/utils/supabase/env";

/**
 * Client Components — викай `createClient()` в компонента (без глобален singleton при SSR).
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export function createClient() {
  const { url, key } = supabasePublicEnv();
  if (!url || !key) {
    throw new Error(
      "Липсват NEXT_PUBLIC_SUPABASE_URL или валиден ключ (NEXT_PUBLIC_SUPABASE_ANON_KEY или NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)"
    );
  }
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:";
  return createBrowserClient(url, key, {
    cookieOptions: {
      sameSite: "lax",
      // На телефон по http://IP:3000 Safari отхвърля Secure бисквитки — само при HTTPS.
      secure,
    },
  });
}

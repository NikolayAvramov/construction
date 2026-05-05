import { createClient } from "@supabase/supabase-js";
import { supabasePublicEnv } from "@/utils/supabase/env";

/**
 * Клиент без cookies — за signUp от Route Handler, за да не се замени сесията на администратора.
 */
export function createSignupClient() {
  const { url, key } = supabasePublicEnv();
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL и ключ липсват");
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

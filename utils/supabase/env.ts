/** Supports dashboard „anon“ (JWT) и „publishable“ (sb_...). */
export function supabasePublicEnv(): {
  url: string | undefined;
  key: string | undefined;
} {
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    // Празен anon не броим — иначе загубваме fallback към publishable.
    key: anon || publishable || undefined,
  };
}

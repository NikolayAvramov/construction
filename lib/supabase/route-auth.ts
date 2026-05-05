import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

/** Ред на профил в `public.profiles` (след миграция от Prisma User). */
export type AppProfile = {
  id: string;
  email: string;
  name: string;
  role: "SUPER_ADMIN" | "BOSS" | "FOREMAN";
  company_id: string | null;
  companies: { id: string; name: string } | null;
};

export type RouteAuthOk = {
  supabase: SupabaseClient;
  user: NonNullable<Awaited<ReturnType<SupabaseClient["auth"]["getUser"]>>["data"]["user"]>;
  profile: AppProfile;
};

/**
 * За API Route Handlers: Supabase сесия от cookies + ред от `profiles`.
 * Използвай след като `supabase/schema.sql` е приложен и потребителите са в Auth + profiles.
 */
export async function getRouteAuth(): Promise<
  | { ok: true; auth: RouteAuthOk }
  | { ok: false; response: Response }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: row, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, name, role, company_id")
    .eq("id", user.id)
    .single();

  if (profileError || !row) {
    return {
      ok: false,
      response: Response.json(
        { error: "Profile missing — complete signup or apply schema/seed." },
        { status: 403 }
      ),
    };
  }

  let companies: { id: string; name: string } | null = null;
  if (row.company_id) {
    const { data: co } = await supabase
      .from("companies")
      .select("id, name")
      .eq("id", row.company_id)
      .maybeSingle();
    companies = co;
  }

  const profile: AppProfile = {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    company_id: row.company_id,
    companies,
  };

  return { ok: true, auth: { supabase, user, profile } };
}

export async function requireAuth(): Promise<
  | { ok: true; auth: RouteAuthOk }
  | { ok: false; response: Response }
> {
  return getRouteAuth();
}

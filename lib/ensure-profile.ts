import type { SupabaseClient, User } from "@supabase/supabase-js";

export type ProfileRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  company_id: string | null;
};

/**
 * Ако няма ред в `profiles`: при празна таблица създава първия потребител като SUPER_ADMIN.
 * Така не е нужно ръчно SQL след създаване на акаунт в Supabase Auth.
 */
export async function ensureProfileForUser(
  supabase: SupabaseClient,
  user: User
): Promise<
  | { ok: true; profile: ProfileRow }
  | { ok: false; reason: string }
> {
  const { data: existing, error: readErr } = await supabase
    .from("profiles")
    .select("id, email, name, role, company_id")
    .eq("id", user.id)
    .maybeSingle();

  if (readErr) {
    return {
      ok: false,
      reason: `profiles: ${readErr.message}. Пусни supabase/schema.sql в SQL Editor.`,
    };
  }

  if (existing) {
    return { ok: true, profile: existing as ProfileRow };
  }

  const { count, error: countErr } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  if (countErr) {
    return { ok: false, reason: `profiles count: ${countErr.message}` };
  }

  if ((count ?? 0) !== 0) {
    return {
      ok: false,
      reason:
        "Няма профил за този акаунт. Първият потребител се създава автоматично; за останалите добави ред в public.profiles.",
    };
  }

  const name =
    (typeof user.user_metadata?.full_name === "string" &&
    user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : null) ||
    user.email?.split("@")[0] ||
    "Администратор";

  const row = {
    id: user.id,
    email: user.email ?? "",
    name,
    role: "SUPER_ADMIN" as const,
    company_id: null as string | null,
  };

  const { data: inserted, error: insErr } = await supabase
    .from("profiles")
    .insert(row)
    .select("id, email, name, role, company_id")
    .single();

  if (insErr) {
    return {
      ok: false,
      reason: `Неуспешно създаване на профил: ${insErr.message}. Провери RLS и дали таблицата profiles съществува.`,
    };
  }

  return { ok: true, profile: inserted as ProfileRow };
}

import type { UserRole } from "@/lib/enums";
import { ensureProfileForUser } from "@/lib/ensure-profile";
import { createClient } from "@/utils/supabase/server";

export const COOKIE = "construction_session";

export type SessionPayload = {
  sub: string;
  role: UserRole;
  email: string;
  companyId: string | null;
};

/**
 * Сесия само от Supabase Auth + public.profiles (без Prisma).
 */
export async function getSessionFromRequest(_req: Request): Promise<SessionPayload | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user?.id) {
      return null;
    }

    const ensured = await ensureProfileForUser(supabase, user);
    if (!ensured.ok) {
      console.error("[auth]", ensured.reason);
      return null;
    }

    const row = ensured.profile;
    return {
      sub: row.id,
      role: row.role as UserRole,
      email: row.email,
      companyId: row.company_id,
    };
  } catch {
    return null;
  }
}

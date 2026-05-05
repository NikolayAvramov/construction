import type { SupabaseClient } from "@supabase/supabase-js";
import { UserRole } from "@/lib/enums";
import type { SessionPayload } from "@/lib/auth";

export function isBoss(user: SessionPayload | null): boolean {
  return user?.role === UserRole.BOSS;
}

export function isSuperAdmin(user: SessionPayload | null): boolean {
  return user?.role === UserRole.SUPER_ADMIN;
}

export async function foremanCanAccessProject(
  supabase: SupabaseClient,
  userId: string,
  projectId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("project_foremen")
    .select("id")
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .maybeSingle();
  return !!data;
}

export function requireAuth(user: SessionPayload | null): Response | null {
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export function requireBoss(user: SessionPayload | null): Response | null {
  const u = requireAuth(user);
  if (u) return u;
  if (user!.role !== UserRole.BOSS) {
    return Response.json({ error: "Boss access required" }, { status: 403 });
  }
  if (!user!.companyId) {
    return Response.json({ error: "Account has no company" }, { status: 403 });
  }
  return null;
}

export function requireSuperAdmin(user: SessionPayload | null): Response | null {
  const u = requireAuth(user);
  if (u) return u;
  if (user!.role !== UserRole.SUPER_ADMIN) {
    return Response.json({ error: "Platform admin required" }, { status: 403 });
  }
  return null;
}

export function blockSuperAdminWithoutCompany(
  user: SessionPayload | null,
  companyId: string | null | undefined
): Response | null {
  const u = requireAuth(user);
  if (u) return u;
  if (user!.role === UserRole.SUPER_ADMIN && !companyId) {
    return Response.json(
      {
        error:
          "За платформен админ добави ?companyId=... към заявката или влез като шеф на фирма.",
      },
      { status: 400 }
    );
  }
  return null;
}

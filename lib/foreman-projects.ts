import { UserRole } from "@/lib/enums";
import type { createClient } from "@/utils/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type ForemanProjectMini = { id: string; name: string };

/** Задава обектите на прораб (само проекти от същата фирма). */
export async function setForemanProjects(
  supabase: Supabase,
  companyId: string,
  foremanUserId: string,
  projectIds: string[]
): Promise<{ error?: string }> {
  const { data: foreman } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", foremanUserId)
    .eq("company_id", companyId)
    .eq("role", UserRole.FOREMAN)
    .maybeSingle();

  if (!foreman) {
    return { error: "Потребителят не е бригадир на тази фирма." };
  }

  const uniqueIds = [...new Set(projectIds.filter(Boolean))];

  if (uniqueIds.length > 0) {
    const { data: projects, error: pErr } = await supabase
      .from("projects")
      .select("id")
      .eq("company_id", companyId)
      .in("id", uniqueIds);

    if (pErr) return { error: pErr.message };
    if ((projects ?? []).length !== uniqueIds.length) {
      return { error: "Един или повече обекти не са от вашата фирма." };
    }
  }

  const { data: companyProjects, error: cpErr } = await supabase
    .from("projects")
    .select("id")
    .eq("company_id", companyId);

  if (cpErr) return { error: cpErr.message };

  const companyProjectIds = (companyProjects ?? []).map((p) => p.id as string);

  if (companyProjectIds.length > 0) {
    const { error: delErr } = await supabase
      .from("project_foremen")
      .delete()
      .eq("user_id", foremanUserId)
      .in("project_id", companyProjectIds);
    if (delErr) return { error: delErr.message };
  }

  if (uniqueIds.length === 0) return {};

  const rows = uniqueIds.map((projectId) => ({
    project_id: projectId,
    user_id: foremanUserId,
  }));

  const { error: insErr } = await supabase.from("project_foremen").insert(rows);
  if (insErr) return { error: insErr.message };
  return {};
}

export async function loadForemanProjectMap(
  supabase: Supabase,
  foremanIds: string[]
): Promise<Record<string, ForemanProjectMini[]>> {
  const map: Record<string, ForemanProjectMini[]> = {};
  if (foremanIds.length === 0) return map;

  const { data: links, error } = await supabase
    .from("project_foremen")
    .select("user_id, projects(id, name)")
    .in("user_id", foremanIds);

  if (error) return map;

  for (const l of links ?? []) {
    const uid = l.user_id as string;
    const raw = l.projects as
      | { id: string; name: string }
      | { id: string; name: string }[]
      | null;
    const p = Array.isArray(raw) ? raw[0] : raw;
    if (!p?.id) continue;
    if (!map[uid]) map[uid] = [];
    map[uid].push({ id: p.id, name: p.name });
  }

  for (const id of foremanIds) {
    if (!map[id]) map[id] = [];
    map[id].sort((a, b) => a.name.localeCompare(b.name, "bg"));
  }

  return map;
}

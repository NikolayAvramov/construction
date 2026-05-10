import { z } from "zod";
import { UserRole } from "@/lib/enums";
import { getSessionFromRequest } from "@/lib/auth";
import { foremanCanAccessProject, requireAuth, requireBoss } from "@/lib/rbac";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const groupCreateSchema = z.object({
  name: z.string().min(1),
  projectId: z.string().min(1),
});

async function projectIdsForBossCompany(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  filterProjectId?: string
): Promise<string[]> {
  let q = supabase.from("projects").select("id").eq("company_id", companyId);
  if (filterProjectId) {
    q = q.eq("id", filterProjectId);
  }
  const { data } = await q;
  return (data ?? []).map((r) => r.id);
}

function parseNadnik(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function mapWorkerRow(w: Record<string, unknown>) {
  return {
    id: w.id,
    name: w.name,
    role: w.role,
    groupId: w.group_id,
    nadnik: parseNadnik(w.nadnik),
    createdAt: w.created_at,
    updatedAt: w.updated_at,
  };
}

function mapGroup(
  g: Record<string, unknown>,
  workers?: Record<string, unknown>[],
  project?: { id: string; name: string } | null
) {
  return {
    id: g.id,
    name: g.name,
    projectId: g.project_id,
    createdAt: g.created_at,
    updatedAt: g.updated_at,
    workers: (workers ?? []).map((x) => mapWorkerRow(x)),
    project: project ?? undefined,
  };
}

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  const denied = requireAuth(session);
  if (denied) return denied;

  const projectId = new URL(req.url).searchParams.get("projectId") ?? undefined;
  const supabase = await createClient();

  if (session!.role === UserRole.BOSS) {
    const pids = await projectIdsForBossCompany(
      supabase,
      session!.companyId!,
      projectId ?? undefined
    );
    if (pids.length === 0) {
      return Response.json([]);
    }
    const { data: groups, error } = await supabase
      .from("worker_groups")
      .select("*")
      .in("project_id", pids)
      .order("name", { ascending: true });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    const result = await Promise.all(
      (groups ?? []).map(async (g) => {
        const { data: workers } = await supabase
          .from("workers")
          .select("*")
          .eq("group_id", g.id);
        const { data: project } = await supabase
          .from("projects")
          .select("id, name")
          .eq("id", g.project_id)
          .maybeSingle();
        return mapGroup(g as Record<string, unknown>, workers ?? [], project);
      })
    );
    return Response.json(result);
  }

  if (!projectId) {
    return Response.json(
      { error: "projectId query required for foreman" },
      { status: 400 }
    );
  }
  const ok = await foremanCanAccessProject(supabase, session!.sub, projectId);
  if (!ok) {
    return Response.json({ error: "No access to this project" }, { status: 403 });
  }

  const { data: proj } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("company_id", session!.companyId!)
    .maybeSingle();
  if (!proj) {
    return Response.json({ error: "No access to this project" }, { status: 403 });
  }

  const { data: groups, error } = await supabase
    .from("worker_groups")
    .select("*")
    .eq("project_id", projectId)
    .order("name", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const result = await Promise.all(
    (groups ?? []).map(async (g) => {
      const { data: workers } = await supabase
        .from("workers")
        .select("*")
        .eq("group_id", g.id);
      return mapGroup(g as Record<string, unknown>, workers ?? []);
    })
  );
  return Response.json(result);
}

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  const denied = requireBoss(session);
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const parsed = groupCreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data: proj } = await supabase
    .from("projects")
    .select("id")
    .eq("id", parsed.data.projectId)
    .eq("company_id", session!.companyId!)
    .maybeSingle();

  if (!proj) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  const { data: g, error } = await supabase
    .from("worker_groups")
    .insert({
      name: parsed.data.name,
      project_id: parsed.data.projectId,
    })
    .select("*")
    .single();

  if (error || !g) {
    return Response.json({ error: error?.message ?? "Create failed" }, { status: 500 });
  }

  return Response.json(mapGroup(g as Record<string, unknown>), { status: 201 });
}

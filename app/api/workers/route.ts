import { z } from "zod";
import { UserRole, WorkerRole } from "@/lib/enums";
import { getSessionFromRequest } from "@/lib/auth";
import { foremanCanAccessProject, requireAuth, requireBoss } from "@/lib/rbac";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

function mapWorkerRow(w: Record<string, unknown>) {
  return {
    id: w.id,
    name: w.name,
    role: w.role,
    groupId: w.group_id,
    createdAt: w.created_at,
    updatedAt: w.updated_at,
  };
}

const workerCreateSchema = z.object({
  name: z.string().min(1),
  role: z.nativeEnum(WorkerRole).optional(),
  groupId: z.string().optional().nullable(),
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
    const { data: groups } = await supabase
      .from("worker_groups")
      .select("id")
      .in("project_id", pids);
    const gids = (groups ?? []).map((g) => g.id);
    if (gids.length === 0) {
      return Response.json([]);
    }
    const { data: workers, error } = await supabase
      .from("workers")
      .select("*")
      .in("group_id", gids)
      .order("name", { ascending: true });
    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    return Response.json((workers ?? []).map(mapWorkerRow));
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

  const { data: groups } = await supabase
    .from("worker_groups")
    .select("id")
    .eq("project_id", projectId);
  const gids = (groups ?? []).map((g) => g.id);
  if (gids.length === 0) {
    return Response.json([]);
  }

  const { data: workers, error } = await supabase
    .from("workers")
    .select("*")
    .in("group_id", gids)
    .order("name", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json((workers ?? []).map(mapWorkerRow));
}

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  const denied = requireBoss(session);
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const parsed = workerCreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const d = parsed.data;
  const supabase = await createClient();

  if (d.groupId) {
    const { data: grp } = await supabase
      .from("worker_groups")
      .select("project_id")
      .eq("id", d.groupId)
      .maybeSingle();
    if (!grp) {
      return Response.json({ error: "Group not found" }, { status: 404 });
    }
    const { data: proj } = await supabase
      .from("projects")
      .select("company_id")
      .eq("id", grp.project_id)
      .maybeSingle();
    if (!proj || proj.company_id !== session!.companyId) {
      return Response.json({ error: "Group not found" }, { status: 404 });
    }
  }

  const insert = {
    name: d.name,
    role: d.role ?? WorkerRole.WORKER,
    group_id: d.groupId ?? null,
  };

  const { data: w, error } = await supabase
    .from("workers")
    .insert(insert)
    .select("*")
    .single();

  if (error || !w) {
    return Response.json({ error: error?.message ?? "Create failed" }, { status: 500 });
  }

  return Response.json(mapWorkerRow(w as Record<string, unknown>), {
    status: 201,
  });
}

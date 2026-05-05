import { z } from "zod";
import { WorkerRole } from "@/lib/enums";
import { getSessionFromRequest } from "@/lib/auth";
import { requireBoss } from "@/lib/rbac";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const workerUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.nativeEnum(WorkerRole).optional(),
  groupId: z.string().optional().nullable(),
});

type Params = { params: Promise<{ workerId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { workerId } = await params;
  const session = await getSessionFromRequest(req);
  const denied = requireBoss(session);
  if (denied) return denied;

  const supabase = await createClient();

  const { data: worker } = await supabase
    .from("workers")
    .select("id, group_id")
    .eq("id", workerId)
    .maybeSingle();

  if (!worker?.group_id) {
    return Response.json({ error: "Worker not found" }, { status: 404 });
  }

  const { data: grp } = await supabase
    .from("worker_groups")
    .select("project_id")
    .eq("id", worker.group_id)
    .maybeSingle();

  if (!grp?.project_id) {
    return Response.json({ error: "Worker not found" }, { status: 404 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("company_id")
    .eq("id", grp.project_id)
    .maybeSingle();

  if (!project || project.company_id !== session!.companyId) {
    return Response.json({ error: "Worker not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = workerUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const d = parsed.data;

  if (d.groupId) {
    const { data: ng } = await supabase
      .from("worker_groups")
      .select("project_id")
      .eq("id", d.groupId)
      .maybeSingle();
    if (!ng) {
      return Response.json({ error: "Group not found" }, { status: 404 });
    }
    const { data: p2 } = await supabase
      .from("projects")
      .select("company_id")
      .eq("id", ng.project_id)
      .maybeSingle();
    if (!p2 || p2.company_id !== session!.companyId) {
      return Response.json({ error: "Group not found" }, { status: 404 });
    }
  }

  const patch: Record<string, unknown> = {};
  if (d.name !== undefined) patch.name = d.name;
  if (d.role !== undefined) patch.role = d.role;
  if (d.groupId !== undefined) patch.group_id = d.groupId;

  const { data: w, error } = await supabase
    .from("workers")
    .update(patch)
    .eq("id", workerId)
    .select("*")
    .maybeSingle();

  if (error || !w) {
    return Response.json({ error: "Worker not found" }, { status: 404 });
  }

  return Response.json({
    id: w.id,
    name: w.name,
    role: w.role,
    groupId: w.group_id,
    createdAt: w.created_at,
    updatedAt: w.updated_at,
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { workerId } = await params;
  const session = await getSessionFromRequest(_req);
  const denied = requireBoss(session);
  if (denied) return denied;

  const supabase = await createClient();
  const { data: worker } = await supabase
    .from("workers")
    .select("id, group_id")
    .eq("id", workerId)
    .maybeSingle();

  if (!worker) {
    return Response.json({ error: "Работникът не е намерен." }, { status: 404 });
  }

  if (worker.group_id) {
    const { data: grp } = await supabase
      .from("worker_groups")
      .select("project_id")
      .eq("id", worker.group_id)
      .maybeSingle();
    if (grp?.project_id) {
      const { data: project } = await supabase
        .from("projects")
        .select("company_id")
        .eq("id", grp.project_id)
        .maybeSingle();
      if (!project || project.company_id !== session!.companyId) {
        return Response.json({ error: "Работникът не е намерен." }, { status: 404 });
      }
    }
  } else {
    return Response.json({ error: "Работникът не е намерен." }, { status: 404 });
  }

  const { error } = await supabase.from("workers").delete().eq("id", workerId);
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return new Response(null, { status: 204 });
}

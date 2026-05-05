import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";
import { requireBoss } from "@/lib/rbac";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const groupUpdateSchema = z.object({ name: z.string().min(1).optional() });

type Params = { params: Promise<{ groupId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { groupId } = await params;
  const session = await getSessionFromRequest(req);
  const denied = requireBoss(session);
  if (denied) return denied;

  const supabase = await createClient();
  const { data: grp } = await supabase
    .from("worker_groups")
    .select("project_id")
    .eq("id", groupId)
    .maybeSingle();

  if (!grp?.project_id) {
    return Response.json({ error: "Group not found" }, { status: 404 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("company_id")
    .eq("id", grp.project_id)
    .maybeSingle();

  if (!project || project.company_id !== session!.companyId) {
    return Response.json({ error: "Group not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = groupUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data: g, error } = await supabase
    .from("worker_groups")
    .update(parsed.data)
    .eq("id", groupId)
    .select("*")
    .maybeSingle();

  if (error || !g) {
    return Response.json({ error: "Group not found" }, { status: 404 });
  }

  return Response.json({
    id: g.id,
    name: g.name,
    projectId: g.project_id,
    createdAt: g.created_at,
    updatedAt: g.updated_at,
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { groupId } = await params;
  const session = await getSessionFromRequest(_req);
  const denied = requireBoss(session);
  if (denied) return denied;

  const supabase = await createClient();
  const { data: grp } = await supabase
    .from("worker_groups")
    .select("project_id")
    .eq("id", groupId)
    .maybeSingle();

  if (!grp?.project_id) {
    return Response.json({ error: "Групата не е намерена." }, { status: 404 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("company_id")
    .eq("id", grp.project_id)
    .maybeSingle();

  if (!project || project.company_id !== session!.companyId) {
    return Response.json({ error: "Групата не е намерена." }, { status: 404 });
  }

  const { error } = await supabase.from("worker_groups").delete().eq("id", groupId);
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return new Response(null, { status: 204 });
}

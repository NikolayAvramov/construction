import { z } from "zod";
import { ProjectStatus, UserRole } from "@/lib/enums";
import { getSessionFromRequest } from "@/lib/auth";
import { mapProject } from "@/lib/map-supabase";
import { projectPublic } from "@/lib/projects";
import { foremanCanAccessProject, requireAuth, requireBoss } from "@/lib/rbac";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  totalPrice: z.coerce.number().nonnegative().optional(),
  advancePayment: z.boolean().optional(),
  advanceAmount: z.coerce.number().nonnegative().optional().nullable(),
  status: z.nativeEnum(ProjectStatus).optional(),
});

type Params = { params: Promise<{ projectId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { projectId } = await params;
  const session = await getSessionFromRequest(req);
  const denied = requireAuth(session);
  if (denied) return denied;

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();

  if (error || !row) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  const p = mapProject(row);

  if (session!.role === UserRole.FOREMAN) {
    const ok = await foremanCanAccessProject(supabase, session!.sub, projectId);
    if (!ok) {
      return Response.json({ error: "No access to this project" }, { status: 403 });
    }
    return Response.json(projectPublic(true, p));
  }

  if (session!.role === UserRole.BOSS) {
    if (p.companyId !== session!.companyId) {
      return Response.json({ error: "No access to this project" }, { status: 403 });
    }
    return Response.json(projectPublic(false, p));
  }

  if (session!.role === UserRole.SUPER_ADMIN) {
    const cid = new URL(req.url).searchParams.get("companyId");
    if (!cid || cid !== p.companyId) {
      return Response.json(
        {
          error: "Подай правилен companyId в query (?companyId=) за този обект.",
        },
        { status: 403 }
      );
    }
    return Response.json(projectPublic(false, p));
  }

  return Response.json({ error: "Forbidden" }, { status: 403 });
}

export async function PATCH(req: Request, { params }: Params) {
  const { projectId } = await params;
  const session = await getSessionFromRequest(req);
  const denied = requireBoss(session);
  if (denied) return denied;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("projects")
    .select("company_id")
    .eq("id", projectId)
    .maybeSingle();

  if (!existing || existing.company_id !== session!.companyId) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const d = parsed.data;

  const patch: Record<string, unknown> = {};
  if (d.name !== undefined) patch.name = d.name;
  if (d.location !== undefined) patch.location = d.location;
  if (d.totalPrice !== undefined) patch.total_price = d.totalPrice;
  if (d.advancePayment !== undefined) patch.advance_payment = d.advancePayment;
  if (d.advanceAmount !== undefined) patch.advance_amount = d.advanceAmount;
  if (d.status !== undefined) patch.status = d.status;
  if (d.advancePayment === false) patch.advance_amount = null;

  const { data: updated, error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", projectId)
    .select("*")
    .maybeSingle();

  if (error || !updated) {
    return Response.json({ error: "Update failed" }, { status: 500 });
  }

  return Response.json(mapProject(updated));
}

export async function DELETE(_req: Request, { params }: Params) {
  const { projectId } = await params;
  const session = await getSessionFromRequest(_req);
  const denied = requireBoss(session);
  if (denied) return denied;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("company_id", session!.companyId!)
    .maybeSingle();

  if (!existing) {
    return Response.json({ error: "Обектът не е намерен." }, { status: 404 });
  }

  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return new Response(null, { status: 204 });
}

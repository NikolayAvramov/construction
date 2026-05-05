import { z } from "zod";
import { UserRole } from "@/lib/enums";
import type { SessionPayload } from "@/lib/auth";
import { getSessionFromRequest } from "@/lib/auth";
import { foremanCanAccessProject } from "@/lib/rbac";
import { requireAuth } from "@/lib/rbac";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  tasksPlanned: z.string().optional(),
  tasksCompleted: z.string().optional(),
  notes: z.string().optional(),
});

type Params = { params: Promise<{ id: string }> };

function mapDaily(row: Record<string, unknown>) {
  return {
    id: row.id,
    projectId: row.project_id,
    date: row.date,
    tasksPlanned: row.tasks_planned,
    tasksCompleted: row.tasks_completed,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function canWriteEntry(
  session: SessionPayload,
  projectId: string
): Promise<boolean> {
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("projects")
    .select("company_id")
    .eq("id", projectId)
    .maybeSingle();

  if (!p || !session.companyId || p.company_id !== session.companyId) {
    return false;
  }
  if (session.role === UserRole.BOSS) {
    return true;
  }
  if (session.role === UserRole.FOREMAN) {
    return foremanCanAccessProject(supabase, session.sub, projectId);
  }
  return false;
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const session = await getSessionFromRequest(req);
  const denied = requireAuth(session);
  if (denied) return denied;

  if (session!.role === UserRole.SUPER_ADMIN) {
    return Response.json({ error: "Нямате достъп." }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: entry } = await supabase
    .from("daily_work_entries")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!entry) {
    return Response.json({ error: "Записът не е намерен." }, { status: 404 });
  }

  const ok = await canWriteEntry(session!, entry.project_id as string);
  if (!ok) {
    return Response.json({ error: "Нямате достъп." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const patch: Record<string, unknown> = {};
  if (d.tasksPlanned !== undefined) patch.tasks_planned = d.tasksPlanned;
  if (d.tasksCompleted !== undefined) patch.tasks_completed = d.tasksCompleted;
  if (d.notes !== undefined) patch.notes = d.notes;

  const { data: row, error } = await supabase
    .from("daily_work_entries")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error || !row) {
    return Response.json({ error: error?.message ?? "Update failed" }, { status: 500 });
  }

  return Response.json(mapDaily(row as Record<string, unknown>));
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const session = await getSessionFromRequest(_req);
  const denied = requireAuth(session);
  if (denied) return denied;

  if (session!.role === UserRole.SUPER_ADMIN) {
    return Response.json({ error: "Нямате достъп." }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: entry } = await supabase
    .from("daily_work_entries")
    .select("project_id")
    .eq("id", id)
    .maybeSingle();

  if (!entry) {
    return Response.json({ error: "Записът не е намерен." }, { status: 404 });
  }

  const ok = await canWriteEntry(session!, entry.project_id as string);
  if (!ok) {
    return Response.json({ error: "Нямате достъп." }, { status: 403 });
  }

  const { error } = await supabase.from("daily_work_entries").delete().eq("id", id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return new Response(null, { status: 204 });
}

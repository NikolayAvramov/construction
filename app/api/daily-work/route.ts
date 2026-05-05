import { z } from "zod";
import { UserRole } from "@/lib/enums";
import { getSessionFromRequest } from "@/lib/auth";
import type { SessionPayload } from "@/lib/auth";
import { foremanCanAccessProject } from "@/lib/rbac";
import { requireAuth } from "@/lib/rbac";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const upsertSchema = z.object({
  projectId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tasksPlanned: z.string().optional(),
  tasksCompleted: z.string().optional(),
  notes: z.string().optional(),
});

async function canWriteDaily(
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

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  const denied = requireAuth(session);
  if (denied) return denied;

  if (session!.role === UserRole.SUPER_ADMIN) {
    return Response.json(
      { error: "Използвай акаунт на шеф или прораб." },
      { status: 403 }
    );
  }

  const supabase = await createClient();
  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId") ?? undefined;
  const from = url.searchParams.get("from") ?? undefined;
  const to = url.searchParams.get("to") ?? undefined;

  if (session!.role === UserRole.BOSS) {
    const { data: plist } = await supabase
      .from("projects")
      .select("id")
      .eq("company_id", session!.companyId!);
    let projIds = (plist ?? []).map((r) => r.id);
    if (projectId) {
      projIds = projIds.filter((id) => id === projectId);
    }
    if (projIds.length === 0) {
      return Response.json([]);
    }

    let q = supabase.from("daily_work_entries").select("*").in("project_id", projIds);

    if (projectId) {
      q = q.eq("project_id", projectId);
    }
    if (from) {
      q = q.gte("date", from);
    }
    if (to) {
      q = q.lte("date", to);
    }

    const { data: rows, error } = await q.order("date", { ascending: false });
    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    return Response.json((rows ?? []).map((r) => mapDaily(r as Record<string, unknown>)));
  }

  if (!projectId) {
    return Response.json(
      { error: "projectId query required for foreman" },
      { status: 400 }
    );
  }
  const ok = await canWriteDaily(session!, projectId);
  if (!ok) {
    return Response.json({ error: "No access to this project" }, { status: 403 });
  }

  let q = supabase
    .from("daily_work_entries")
    .select("*")
    .eq("project_id", projectId);

  if (from) {
    q = q.gte("date", from);
  }
  if (to) {
    q = q.lte("date", to);
  }

  const { data: rows, error } = await q.order("date", { ascending: false });
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json((rows ?? []).map((r) => mapDaily(r as Record<string, unknown>)));
}

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  const denied = requireAuth(session);
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { projectId, date, tasksPlanned, tasksCompleted, notes } = parsed.data;
  const can = await canWriteDaily(session!, projectId);
  if (!can) {
    return Response.json({ error: "No access to this project" }, { status: 403 });
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("daily_work_entries")
    .select("id")
    .eq("project_id", projectId)
    .eq("date", date)
    .maybeSingle();

  const payload = {
    project_id: projectId,
    date,
    tasks_planned: tasksPlanned ?? "",
    tasks_completed: tasksCompleted ?? "",
    notes: notes ?? "",
  };

  if (existing) {
    const { data: row, error } = await supabase
      .from("daily_work_entries")
      .update({
        tasks_planned: tasksPlanned ?? undefined,
        tasks_completed: tasksCompleted ?? undefined,
        notes: notes ?? undefined,
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    return Response.json(mapDaily(row as Record<string, unknown>), { status: 201 });
  }

  const { data: row, error } = await supabase
    .from("daily_work_entries")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(mapDaily(row as Record<string, unknown>), { status: 201 });
}

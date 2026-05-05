import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { UserRole } from "@/lib/enums";
import type { SessionPayload } from "@/lib/auth";
import { getSessionFromRequest } from "@/lib/auth";
import { foremanCanAccessProject } from "@/lib/rbac";
import { requireAuth } from "@/lib/rbac";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const entrySchema = z.object({
  workerId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  present: z.boolean(),
  hours: z.coerce.number().nonnegative().optional().nullable(),
});

async function canTouchWorker(
  supabase: SupabaseClient,
  user: SessionPayload,
  workerId: string
): Promise<boolean> {
  if (user.role === UserRole.SUPER_ADMIN) {
    return false;
  }

  const { data: worker } = await supabase
    .from("workers")
    .select("group_id")
    .eq("id", workerId)
    .maybeSingle();

  if (!worker?.group_id) {
    return false;
  }

  const { data: grp } = await supabase
    .from("worker_groups")
    .select("project_id")
    .eq("id", worker.group_id)
    .maybeSingle();

  if (!grp?.project_id) {
    return false;
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, company_id")
    .eq("id", grp.project_id)
    .maybeSingle();

  if (!project) {
    return false;
  }

  if (user.role === UserRole.BOSS) {
    return !!user.companyId && project.company_id === user.companyId;
  }

  if (user.role === UserRole.FOREMAN) {
    if (!user.companyId || project.company_id !== user.companyId) {
      return false;
    }
    return foremanCanAccessProject(supabase, user.sub, project.id);
  }

  return false;
}

function mapAttendanceRow(a: Record<string, unknown>, worker?: Record<string, unknown>) {
  return {
    id: a.id,
    workerId: a.worker_id,
    date: a.date,
    present: a.present,
    hours: a.hours,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
    worker: worker
      ? {
          id: worker.id,
          name: worker.name,
          role: worker.role,
          groupId: worker.group_id,
          group: worker.group,
        }
      : undefined,
  };
}

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  const denied = requireAuth(session);
  if (denied) return denied;

  if (session!.role === UserRole.SUPER_ADMIN) {
    return Response.json(
      { error: "Използвай акаунт на шеф или прораб за присъствие." },
      { status: 403 }
    );
  }

  const supabase = await createClient();
  const url = new URL(req.url);
  const workerId = url.searchParams.get("workerId") ?? undefined;
  const projectId = url.searchParams.get("projectId") ?? undefined;
  const from = url.searchParams.get("from") ?? undefined;
  const to = url.searchParams.get("to") ?? undefined;

  const user = session!;
  const companyId = user.companyId!;

  let q = supabase.from("attendances").select("*, worker:workers(*)");

  if (from) {
    q = q.gte("date", from);
  }
  if (to) {
    q = q.lte("date", to);
  }

  if (user.role === UserRole.BOSS) {
    const { data: projRows } = await supabase
      .from("projects")
      .select("id")
      .eq("company_id", companyId);
    let pids = (projRows ?? []).map((p) => p.id);
    if (projectId) {
      pids = pids.filter((id) => id === projectId);
    }
    const filterPid = pids;
    if (filterPid.length === 0) {
      return Response.json([]);
    }
    const { data: groups } = await supabase
      .from("worker_groups")
      .select("id")
      .in("project_id", filterPid);
    const gids = (groups ?? []).map((g) => g.id);
    const { data: workers } = await supabase
      .from("workers")
      .select("id")
      .in("group_id", gids);
    const wids = (workers ?? []).map((w) => w.id);
    if (wids.length === 0) {
      return Response.json([]);
    }

    if (projectId && !workerId) {
      q = q.in("worker_id", wids);
    } else if (workerId) {
      if (!wids.includes(workerId)) {
        return Response.json([]);
      }
      q = q.eq("worker_id", workerId);
    } else {
      q = q.in("worker_id", wids);
    }

    const { data: rows, error } = await q.order("date", { ascending: false });
    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    return Response.json(
      (rows ?? []).map((r) =>
        mapAttendanceRow(r as Record<string, unknown>, (r as { worker?: Record<string, unknown> }).worker as Record<string, unknown>)
      )
    );
  }

  if (!projectId) {
    return Response.json(
      { error: "projectId query required for foreman" },
      { status: 400 }
    );
  }

  const link = await foremanCanAccessProject(supabase, user.sub, projectId);
  if (!link) {
    return Response.json({ error: "No access to this project" }, { status: 403 });
  }

  const { data: proj } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (!proj) {
    return Response.json({ error: "No access to this project" }, { status: 403 });
  }

  const { data: groups } = await supabase
    .from("worker_groups")
    .select("id")
    .eq("project_id", projectId);
  const gids = (groups ?? []).map((g) => g.id);
  const { data: workers } = await supabase
    .from("workers")
    .select("id")
    .in("group_id", gids);
  const ids = (workers ?? []).map((w) => w.id);

  let q2 = supabase.from("attendances").select("*, worker:workers(*)");

  if (from) {
    q2 = q2.gte("date", from);
  }
  if (to) {
    q2 = q2.lte("date", to);
  }

  if (workerId) {
    if (!ids.includes(workerId)) {
      return Response.json([]);
    }
    q2 = q2.eq("worker_id", workerId);
  } else {
    q2 = q2.in("worker_id", ids);
  }

  const { data: rows, error } = await q2.order("date", { ascending: false });
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(
    (rows ?? []).map((r) =>
      mapAttendanceRow(r as Record<string, unknown>, (r as { worker?: Record<string, unknown> }).worker as Record<string, unknown>)
    )
  );
}

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  const denied = requireAuth(session);
  if (denied) return denied;

  const supabase = await createClient();
  const body = await req.json().catch(() => null);
  const parsed = entrySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { workerId, date, present, hours } = parsed.data;
  const ok = await canTouchWorker(supabase, session!, workerId);
  if (!ok) {
    return Response.json(
      { error: "Cannot log attendance for this worker" },
      { status: 403 }
    );
  }

  const day = date;

  const { data: existing } = await supabase
    .from("attendances")
    .select("id")
    .eq("worker_id", workerId)
    .eq("date", day)
    .maybeSingle();

  const payload = {
    worker_id: workerId,
    date: day,
    present,
    hours: present ? hours ?? null : null,
  };

  if (existing) {
    const { data: row, error } = await supabase
      .from("attendances")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    return Response.json(mapAttendanceRow(row as Record<string, unknown>), {
      status: 201,
    });
  }

  const { data: row, error } = await supabase
    .from("attendances")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(mapAttendanceRow(row as Record<string, unknown>), {
    status: 201,
  });
}

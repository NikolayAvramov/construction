import { UserRole } from "@/lib/enums";
import { getSessionFromRequest } from "@/lib/auth";
import { foremanCanAccessProject, requireAuth } from "@/lib/rbac";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

/** Работници на обекта с отбелязана платена заплата за избрания месец. */
export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  const denied = requireAuth(session);
  if (denied) return denied;

  const companyId = session!.companyId;
  if (!companyId) {
    return Response.json({ error: "Липсва фирма за профила." }, { status: 403 });
  }

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  const year = url.searchParams.get("year")
    ? Number(url.searchParams.get("year"))
    : new Date().getFullYear();
  const month = url.searchParams.get("month")
    ? Number(url.searchParams.get("month"))
    : new Date().getMonth() + 1;

  if (!projectId) {
    return Response.json({ error: "projectId е задължителен." }, { status: 400 });
  }
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return Response.json({ error: "Невалиден месец." }, { status: 400 });
  }

  const supabase = await createClient();

  if (session!.role === UserRole.BOSS) {
    const { data: proj } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (!proj) {
      return Response.json({ error: "Обектът не е намерен." }, { status: 404 });
    }
  } else if (session!.role === UserRole.FOREMAN) {
    const ok = await foremanCanAccessProject(supabase, session!.sub, projectId);
    if (!ok) {
      return Response.json({ error: "Няма достъп до обекта." }, { status: 403 });
    }
  } else {
    return Response.json({ error: "Няма достъп." }, { status: 403 });
  }

  const { data: groups } = await supabase
    .from("worker_groups")
    .select("id")
    .eq("project_id", projectId);
  const gids = (groups ?? []).map((g) => g.id);
  if (gids.length === 0) {
    return Response.json({ paidWorkerIds: [] as string[] });
  }

  const { data: workers } = await supabase
    .from("workers")
    .select("id")
    .in("group_id", gids);
  const wids = (workers ?? []).map((w) => w.id);
  if (wids.length === 0) {
    return Response.json({ paidWorkerIds: [] as string[] });
  }

  const { data: payouts, error } = await supabase
    .from("worker_salary_payouts")
    .select("worker_id")
    .eq("company_id", companyId)
    .eq("year", year)
    .eq("month", month)
    .in("worker_id", wids);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const paidWorkerIds = [...new Set((payouts ?? []).map((p) => p.worker_id as string))];
  return Response.json({ paidWorkerIds });
}

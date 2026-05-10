import { getSessionFromRequest } from "@/lib/auth";
import { requireBoss } from "@/lib/rbac";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function monthBounds(year: number, month: number) {
  const last = new Date(year, month, 0).getDate();
  return {
    from: `${year}-${pad2(month)}-01`,
    to: `${year}-${pad2(month)}-${pad2(last)}`,
  };
}

function numNadnik(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

type PendingSalaryRow = {
  workerId: string;
  name: string;
  projectId: string;
  projectName: string;
  workDays: number;
  nadnik: number;
  amount: number;
  year: number;
  month: number;
  paid?: boolean;
};

/** Заплати по надник × присъствени дни за избрания месец (за всички обекти на фирмата). */
export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  const denied = requireBoss(session);
  if (denied) return denied;

  const companyId = session!.companyId;
  if (!companyId) {
    return Response.json({ error: "Липсва фирма за профила." }, { status: 400 });
  }

  const url = new URL(req.url);
  const now = new Date();
  const year = url.searchParams.get("year")
    ? Number(url.searchParams.get("year"))
    : now.getFullYear();
  const month = url.searchParams.get("month")
    ? Number(url.searchParams.get("month"))
    : now.getMonth() + 1;

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return Response.json({ error: "Невалиден месец." }, { status: 400 });
  }

  const { from, to } = monthBounds(year, month);
  const supabase = await createClient();

  const { data: projects, error: pe } = await supabase
    .from("projects")
    .select("id, name")
    .eq("company_id", companyId);

  if (pe) {
    return Response.json({ error: pe.message }, { status: 500 });
  }

  const plist = projects ?? [];
  const pids = plist.map((p) => p.id);
  const projectNameById = new Map(plist.map((p) => [p.id, p.name] as const));

  if (pids.length === 0) {
    return Response.json({
      year,
      month,
      items: [] as PendingSalaryRow[],
    });
  }

  const { data: groups, error: ge } = await supabase
    .from("worker_groups")
    .select("id, project_id")
    .in("project_id", pids);

  if (ge) {
    return Response.json({ error: ge.message }, { status: 500 });
  }

  const glist = groups ?? [];
  const gids = glist.map((g) => g.id);
  const groupProject = new Map(
    glist.map((g) => [g.id, g.project_id] as const)
  );

  if (gids.length === 0) {
    return Response.json({ year, month, items: [] });
  }

  const { data: workers, error: we } = await supabase
    .from("workers")
    .select("id, name, group_id, nadnik")
    .in("group_id", gids);

  if (we) {
    return Response.json({ error: we.message }, { status: 500 });
  }

  const withRate = (workers ?? []).filter((w) => {
    const pid = w.group_id ? groupProject.get(w.group_id) : undefined;
    return pid && numNadnik(w.nadnik) != null;
  });

  const wids = withRate.map((w) => w.id);
  if (wids.length === 0) {
    return Response.json({ year, month, items: [] });
  }

  const { data: attRows, error: ae } = await supabase
    .from("attendances")
    .select("worker_id")
    .in("worker_id", wids)
    .gte("date", from)
    .lte("date", to)
    .eq("present", true);

  if (ae) {
    return Response.json({ error: ae.message }, { status: 500 });
  }

  const dayCount = new Map<string, number>();
  for (const r of attRows ?? []) {
    const id = r.worker_id as string;
    dayCount.set(id, (dayCount.get(id) ?? 0) + 1);
  }

  const items: PendingSalaryRow[] = [];
  for (const w of withRate) {
    const days = dayCount.get(w.id) ?? 0;
    if (days === 0) continue;
    const rate = numNadnik(w.nadnik)!;
    const projId = groupProject.get(w.group_id!)!;
    const projName = projectNameById.get(projId) ?? "Обект";
    const amount = Math.round(rate * days * 100) / 100;
    items.push({
      workerId: w.id,
      name: w.name as string,
      projectId: projId,
      projectName: projName,
      workDays: days,
      nadnik: rate,
      amount,
      year,
      month,
    });
  }

  items.sort((a, b) => {
    const p = a.projectName.localeCompare(b.projectName, "bg");
    if (p !== 0) return p;
    return a.name.localeCompare(b.name, "bg");
  });

  const ids = items.map((i) => i.workerId);
  let itemsWithPaid = items.map((i) => ({ ...i, paid: false }));
  if (ids.length > 0) {
    const { data: payoutRows, error: payoutErr } = await supabase
      .from("worker_salary_payouts")
      .select("worker_id")
      .eq("company_id", companyId)
      .eq("year", year)
      .eq("month", month)
      .in("worker_id", ids);

    if (!payoutErr && payoutRows) {
      const paidSet = new Set(
        payoutRows.map((r) => r.worker_id as string)
      );
      itemsWithPaid = items.map((i) => ({
        ...i,
        paid: paidSet.has(i.workerId),
      }));
    }
  }

  return Response.json({ year, month, items: itemsWithPaid });
}

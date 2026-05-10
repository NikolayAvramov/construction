import { z } from "zod";
import { ExpenseCategory } from "@/lib/enums";
import { getSessionFromRequest } from "@/lib/auth";
import { requireBoss } from "@/lib/rbac";
import { appendFinanceSqlHint } from "@/lib/finance-sql-hint";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  workerId: z.string().min(1),
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  /** Дата на разхода (плащане); по подразбиране днес. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

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

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  const denied = requireBoss(session);
  if (denied) return denied;

  const companyId = session!.companyId;
  if (!companyId) {
    return Response.json({ error: "Липсва фирма за профила." }, { status: 400 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: "Невалидни данни.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { workerId, year, month } = parsed.data;
  const expenseDate =
    parsed.data.date ?? new Date().toISOString().slice(0, 10);

  const supabase = await createClient();
  const { from, to } = monthBounds(year, month);

  const { data: projects } = await supabase
    .from("projects")
    .select("id")
    .eq("company_id", companyId);
  const pids = (projects ?? []).map((p) => p.id);
  if (pids.length === 0) {
    return Response.json({ error: "Няма обекти." }, { status: 400 });
  }

  const { data: groups } = await supabase
    .from("worker_groups")
    .select("id, project_id")
    .in("project_id", pids);
  const gids = (groups ?? []).map((g) => g.id);
  const groupProject = new Map(
    (groups ?? []).map((g) => [g.id, g.project_id] as const)
  );

  const { data: worker } = await supabase
    .from("workers")
    .select("id, name, group_id, nadnik")
    .eq("id", workerId)
    .maybeSingle();

  if (!worker?.group_id || !gids.includes(worker.group_id)) {
    return Response.json({ error: "Работникът не е в екип на вашата фирма." }, {
      status: 404,
    });
  }

  const projectId = groupProject.get(worker.group_id);
  if (!projectId || !pids.includes(projectId)) {
    return Response.json({ error: "Няма достъп до обекта на работника." }, {
      status: 403,
    });
  }

  const rate = numNadnik(worker.nadnik);
  if (rate == null) {
    return Response.json(
      { error: "Работникът няма зададен надник." },
      { status: 400 }
    );
  }

  const { data: attRows } = await supabase
    .from("attendances")
    .select("id")
    .eq("worker_id", workerId)
    .gte("date", from)
    .lte("date", to)
    .eq("present", true);

  const days = (attRows ?? []).length;
  if (days === 0) {
    return Response.json(
      { error: "Няма записани присъствия за този месец." },
      { status: 400 }
    );
  }

  const { data: alreadyPaid } = await supabase
    .from("worker_salary_payouts")
    .select("id")
    .eq("worker_id", workerId)
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();

  if (alreadyPaid) {
    return Response.json(
      {
        error:
          "Заплатата за този месец вече е отбелязана като платена. Проверете разходите или месечния календар.",
      },
      { status: 409 }
    );
  }

  const amount = Math.round(rate * days * 100) / 100;
  const monthLabel = `${pad2(month)}.${year}`;
  const description = `Заплата: ${worker.name} (${monthLabel}, ${days} дн. × ${rate} EUR/ден)`;

  const { data: row, error } = await supabase
    .from("expenses")
    .insert({
      company_id: companyId,
      project_id: projectId,
      amount,
      date: expenseDate,
      category: ExpenseCategory.SALARIES,
      description,
    })
    .select("*")
    .single();

  if (error || !row) {
    const msg = error?.message ?? "Неуспешен запис на разход.";
    return Response.json({ error: msg + appendFinanceSqlHint(msg) }, { status: 500 });
  }

  const { error: payoutErr } = await supabase.from("worker_salary_payouts").insert({
    company_id: companyId,
    worker_id: workerId,
    year,
    month,
    expense_id: row.id,
  });

  if (payoutErr) {
    await supabase.from("expenses").delete().eq("id", row.id);
    const pm = payoutErr.message;
    return Response.json(
      { error: pm + appendFinanceSqlHint(pm) },
      { status: 500 }
    );
  }

  return Response.json(
    {
      id: row.id,
      amount: row.amount,
      date: row.date,
      category: row.category,
      projectId: row.project_id,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
    { status: 201 }
  );
}

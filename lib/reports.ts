import { createClient } from "@/utils/supabase/server";

/** Суми по разходи/плащания за интервал (глобално — всички проекти). */
export async function sumsForRange(from: Date, to: Date) {
  const supabase = await createClient();
  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);

  const { data: expRows } = await supabase
    .from("expenses")
    .select("amount")
    .gte("date", fromStr)
    .lte("date", toStr);

  const { data: payRows } = await supabase
    .from("payments")
    .select("amount")
    .gte("date", fromStr)
    .lte("date", toStr);

  const totalExpenses = (expRows ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const totalRevenue = (payRows ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const profit = totalRevenue - totalExpenses;

  return {
    totalExpenses,
    totalRevenue,
    profit,
  };
}

/** Разходи/приходи само за проекти на дадена фирма */
export async function sumsForRangeCompany(
  companyId: string,
  from: Date,
  to: Date
) {
  const supabase = await createClient();
  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);

  const { data: projects } = await supabase
    .from("projects")
    .select("id")
    .eq("company_id", companyId);

  const pids = (projects ?? []).map((p) => p.id);

  const { data: expRows } = await supabase
    .from("expenses")
    .select("amount")
    .eq("company_id", companyId)
    .gte("date", fromStr)
    .lte("date", toStr);

  let payRows: { amount: unknown }[] | null = null;
  if (pids.length > 0) {
    const { data } = await supabase
      .from("payments")
      .select("amount")
      .in("project_id", pids)
      .gte("date", fromStr)
      .lte("date", toStr);
    payRows = data;
  }

  const totalExpenses = (expRows ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const totalRevenue = (payRows ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const profit = totalRevenue - totalExpenses;

  return { totalExpenses, totalRevenue, profit };
}


export async function generateMonthlyReport(year: number, month: number) {
  const supabase = await createClient();
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  const { totalExpenses, totalRevenue, profit } = await sumsForRange(start, end);

  const { data: row, error } = await supabase
    .from("monthly_reports")
    .upsert(
      {
        year,
        month,
        total_expenses: totalExpenses,
        total_revenue: totalRevenue,
        profit,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "year,month" }
    )
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return row;
}

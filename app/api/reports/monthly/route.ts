import { getSessionFromRequest } from "@/lib/auth";
import { sumsForRangeCompany } from "@/lib/reports";
import { requireBoss } from "@/lib/rbac";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  const denied = requireBoss(session);
  if (denied) return denied;

  const url = new URL(req.url);
  const year = url.searchParams.get("year")
    ? Number(url.searchParams.get("year"))
    : new Date().getUTCFullYear();
  const month = url.searchParams.get("month")
    ? Number(url.searchParams.get("month"))
    : new Date().getUTCMonth() + 1;
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return Response.json({ error: "Invalid year/month" }, { status: 400 });
  }

  const companyId = session!.companyId!;
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const { totalExpenses, totalRevenue, profit } = await sumsForRangeCompany(
    companyId,
    start,
    end
  );

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("monthly_reports")
    .select("generated_at")
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();

  return Response.json({
    year,
    month,
    totalExpenses,
    totalRevenue,
    profit,
    generatedAt: existing?.generated_at ?? null,
    onTheFly: true,
    note: "Стойностите са за проектите на вашата фирма за избрания месец.",
  });
}

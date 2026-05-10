import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";
import { requireBoss } from "@/lib/rbac";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const customSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  projectId: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  const denied = requireBoss(session);
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const parsed = customSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { from, to, projectId } = parsed.data;
  const d0 = from;
  const d1 = to;
  const companyId = session!.companyId!;
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id")
    .eq("company_id", companyId);

  const pids = (projects ?? []).map((p) => p.id);

  let expQuery = supabase
    .from("expenses")
    .select("amount")
    .eq("company_id", companyId)
    .gte("date", d0)
    .lte("date", d1);

  if (projectId) {
    if (!pids.includes(projectId)) {
      return Response.json({
        from: d0,
        to: d1,
        projectId: projectId ?? null,
        companyId,
        totalExpenses: 0,
        totalRevenue: 0,
        profit: 0,
      });
    }
    expQuery = expQuery.eq("project_id", projectId);
  }

  const { data: expRows } = await expQuery;

  let payRows: { amount: unknown }[] | null = null;
  if (projectId) {
    const { data } = await supabase
      .from("payments")
      .select("amount")
      .eq("project_id", projectId)
      .gte("date", d0)
      .lte("date", d1);
    payRows = data;
  } else if (pids.length > 0) {
    const { data } = await supabase
      .from("payments")
      .select("amount")
      .in("project_id", pids)
      .gte("date", d0)
      .lte("date", d1);
    payRows = data;
  }

  const totalExpenses = (expRows ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const totalRevenue = (payRows ?? []).reduce((s, r) => s + Number(r.amount), 0);

  return Response.json({
    from: d0,
    to: d1,
    projectId: projectId ?? null,
    companyId,
    totalExpenses,
    totalRevenue,
    profit: totalRevenue - totalExpenses,
  });
}

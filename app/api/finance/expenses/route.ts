import { z } from "zod";
import { ExpenseCategory } from "@/lib/enums";
import { getSessionFromRequest } from "@/lib/auth";
import { requireBoss } from "@/lib/rbac";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const expenseSchema = z.object({
  amount: z.coerce.number().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.nativeEnum(ExpenseCategory),
  projectId: z.string().min(1),
  description: z.string().optional(),
});

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  const denied = requireBoss(session);
  if (denied) return denied;

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId") ?? undefined;
  const from = url.searchParams.get("from") ?? undefined;
  const to = url.searchParams.get("to") ?? undefined;

  const companyId = session!.companyId!;
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id")
    .eq("company_id", companyId);
  const pids = (projects ?? []).map((p) => p.id);
  if (pids.length === 0) {
    return Response.json([]);
  }

  let filterIds = pids;
  if (projectId) {
    filterIds = pids.includes(projectId) ? [projectId] : [];
  }
  if (filterIds.length === 0) {
    return Response.json([]);
  }

  let q = supabase
    .from("expenses")
    .select("*, projects(id, name)")
    .in("project_id", filterIds);

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

  const mapped = (rows ?? []).map((r) => ({
    id: r.id,
    amount: r.amount,
    date: r.date,
    category: r.category,
    projectId: r.project_id,
    description: r.description,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    project: (r as { projects?: { id: string; name: string } }).projects,
  }));

  return Response.json(mapped);
}

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  const denied = requireBoss(session);
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const parsed = expenseSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const d = parsed.data;

  const supabase = await createClient();
  const { data: p } = await supabase
    .from("projects")
    .select("id")
    .eq("id", d.projectId)
    .eq("company_id", session!.companyId!)
    .maybeSingle();

  if (!p) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  const { data: row, error } = await supabase
    .from("expenses")
    .insert({
      amount: d.amount,
      date: d.date,
      category: d.category,
      project_id: d.projectId,
      description: d.description ?? null,
    })
    .select("*")
    .single();

  if (error || !row) {
    return Response.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
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

import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";
import { requireBoss } from "@/lib/rbac";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const paymentSchema = z.object({
  projectId: z.string().min(1),
  amount: z.coerce.number().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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

  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id")
    .eq("company_id", session!.companyId!);
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
    .from("payments")
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

  return Response.json(
    (rows ?? []).map((r) => ({
      id: r.id,
      projectId: r.project_id,
      amount: r.amount,
      date: r.date,
      description: r.description,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      project: (r as { projects?: { id: string; name: string } }).projects,
    }))
  );
}

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  const denied = requireBoss(session);
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const d = parsed.data;

  const supabase = await createClient();
  const { data: proj } = await supabase
    .from("projects")
    .select("id")
    .eq("id", d.projectId)
    .eq("company_id", session!.companyId!)
    .maybeSingle();

  if (!proj) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  const { data: row, error } = await supabase
    .from("payments")
    .insert({
      project_id: d.projectId,
      amount: d.amount,
      date: d.date,
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
      projectId: row.project_id,
      amount: row.amount,
      date: row.date,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
    { status: 201 }
  );
}

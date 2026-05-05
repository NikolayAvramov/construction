import { z } from "zod";
import { ExpenseCategory } from "@/lib/enums";
import { getSessionFromRequest } from "@/lib/auth";
import { requireBoss } from "@/lib/rbac";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  amount: z.coerce.number().positive().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  category: z.nativeEnum(ExpenseCategory).optional(),
  projectId: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
});

type Params = { params: Promise<{ id: string }> };

async function assertExpenseOwned(
  supabase: Awaited<ReturnType<typeof createClient>>,
  expenseId: string,
  companyId: string
): Promise<{ project_id: string } | null> {
  const { data: e } = await supabase
    .from("expenses")
    .select("id, project_id")
    .eq("id", expenseId)
    .maybeSingle();
  if (!e) return null;
  const { data: p } = await supabase
    .from("projects")
    .select("company_id")
    .eq("id", e.project_id)
    .maybeSingle();
  if (!p || p.company_id !== companyId) return null;
  return { project_id: e.project_id };
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const session = await getSessionFromRequest(req);
  const denied = requireBoss(session);
  if (denied) return denied;

  const supabase = await createClient();
  const owned = await assertExpenseOwned(supabase, id, session!.companyId!);
  if (!owned) {
    return Response.json({ error: "Разходът не е намерен." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const d = parsed.data;

  if (d.projectId) {
    const { data: p } = await supabase
      .from("projects")
      .select("id")
      .eq("id", d.projectId)
      .eq("company_id", session!.companyId!)
      .maybeSingle();
    if (!p) {
      return Response.json({ error: "Обектът не е намерен." }, { status: 404 });
    }
  }

  const patch: Record<string, unknown> = {};
  if (d.amount !== undefined) patch.amount = d.amount;
  if (d.date !== undefined) patch.date = d.date;
  if (d.category !== undefined) patch.category = d.category;
  if (d.projectId !== undefined) patch.project_id = d.projectId;
  if (d.description !== undefined) patch.description = d.description;

  const { data: row, error } = await supabase
    .from("expenses")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error || !row) {
    return Response.json({ error: error?.message ?? "Update failed" }, { status: 500 });
  }

  return Response.json({
    id: row.id,
    amount: row.amount,
    date: row.date,
    category: row.category,
    projectId: row.project_id,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const session = await getSessionFromRequest(_req);
  const denied = requireBoss(session);
  if (denied) return denied;

  const supabase = await createClient();
  const owned = await assertExpenseOwned(supabase, id, session!.companyId!);
  if (!owned) {
    return Response.json({ error: "Разходът не е намерен." }, { status: 404 });
  }

  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return new Response(null, { status: 204 });
}

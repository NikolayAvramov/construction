import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";
import { requireBoss } from "@/lib/rbac";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  amount: z.coerce.number().positive().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  projectId: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
});

type Params = { params: Promise<{ id: string }> };

async function assertPaymentOwned(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paymentId: string,
  companyId: string
): Promise<boolean> {
  const { data: pay } = await supabase
    .from("payments")
    .select("id, project_id")
    .eq("id", paymentId)
    .maybeSingle();
  if (!pay) return false;
  const { data: p } = await supabase
    .from("projects")
    .select("company_id")
    .eq("id", pay.project_id)
    .maybeSingle();
  return !!(p && p.company_id === companyId);
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const session = await getSessionFromRequest(req);
  const denied = requireBoss(session);
  if (denied) return denied;

  const supabase = await createClient();
  const ok = await assertPaymentOwned(supabase, id, session!.companyId!);
  if (!ok) {
    return Response.json({ error: "Плащането не е намерено." }, { status: 404 });
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
  if (d.projectId !== undefined) patch.project_id = d.projectId;
  if (d.description !== undefined) patch.description = d.description;

  const { data: row, error } = await supabase
    .from("payments")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error || !row) {
    return Response.json({ error: error?.message ?? "Update failed" }, { status: 500 });
  }

  return Response.json({
    id: row.id,
    projectId: row.project_id,
    amount: row.amount,
    date: row.date,
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
  const ok = await assertPaymentOwned(supabase, id, session!.companyId!);
  if (!ok) {
    return Response.json({ error: "Плащането не е намерено." }, { status: 404 });
  }

  const { error } = await supabase.from("payments").delete().eq("id", id);
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return new Response(null, { status: 204 });
}

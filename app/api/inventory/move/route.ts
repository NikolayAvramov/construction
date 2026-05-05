import { z } from "zod";
import { UserRole } from "@/lib/enums";
import { getSessionFromRequest } from "@/lib/auth";
import { foremanCanAccessProject } from "@/lib/rbac";
import { requireAuth } from "@/lib/rbac";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const moveSchema = z.object({
  inventoryItemId: z.string().min(1),
  projectId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  note: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  const denied = requireAuth(session);
  if (denied) return denied;
  const sess = session!;

  if (!sess.companyId) {
    return Response.json({ error: "No company" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = moveSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { inventoryItemId, projectId, quantity, note } = parsed.data;

  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("company_id")
    .eq("id", projectId)
    .maybeSingle();

  if (!project || project.company_id !== sess.companyId) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  if (sess.role === UserRole.FOREMAN) {
    const ok = await foremanCanAccessProject(supabase, sess.sub, projectId);
    if (!ok) {
      return Response.json({ error: "No access to this project" }, { status: 403 });
    }
  }

  const { data: itemCheck } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("id", inventoryItemId)
    .eq("company_id", sess.companyId)
    .maybeSingle();

  if (!itemCheck) {
    return Response.json({ error: "Inventory item not found" }, { status: 404 });
  }

  const currentQty = Number(itemCheck.quantity);
  if (currentQty < quantity) {
    return Response.json({ error: "Insufficient stock" }, { status: 400 });
  }

  const nextQty = currentQty - quantity;

  const { error: upErr } = await supabase
    .from("inventory_items")
    .update({ quantity: nextQty })
    .eq("id", inventoryItemId);

  if (upErr) {
    return Response.json({ error: upErr.message }, { status: 500 });
  }

  const { data: movement, error: mvErr } = await supabase
    .from("material_movements")
    .insert({
      inventory_item_id: inventoryItemId,
      project_id: projectId,
      quantity,
      note: note ?? null,
    })
    .select("*")
    .single();

  if (mvErr || !movement) {
    await supabase
      .from("inventory_items")
      .update({ quantity: currentQty })
      .eq("id", inventoryItemId);
    return Response.json({ error: mvErr?.message ?? "Move failed" }, { status: 500 });
  }

  const { data: itemRow } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("id", inventoryItemId)
    .single();
  const { data: projRow } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .single();

  return Response.json(
    {
      ...movement,
      item: itemRow,
      project: projRow ? { id: projRow.id, name: projRow.name } : null,
    },
    { status: 201 }
  );
}

import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";
import { requireBoss } from "@/lib/rbac";
import { createClient } from "@/utils/supabase/server";
import {
  mapInventoryItem,
  isMissingUnitCostColumn,
} from "@/app/api/inventory/items/route";

export const dynamic = "force-dynamic";

const itemUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  quantity: z.coerce.number().nonnegative().optional(),
  unit: z.string().min(1).optional(),
  /** null изчиства запазената цена */
  unitCostEur: z.union([z.coerce.number().nonnegative(), z.null()]).optional(),
  purchaseTotalEur: z.coerce.number().nonnegative().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const session = await getSessionFromRequest(req);
  const denied = requireBoss(session);
  if (denied) return denied;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("id", id)
    .eq("company_id", session!.companyId!)
    .maybeSingle();

  if (!existing) {
    return Response.json({ error: "Item not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = itemUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.quantity !== undefined) patch.quantity = parsed.data.quantity;
  if (parsed.data.unit !== undefined) patch.unit = parsed.data.unit;

  const nextQty =
    parsed.data.quantity !== undefined
      ? parsed.data.quantity
      : Number(existing.quantity);

  if (parsed.data.unitCostEur !== undefined) {
    patch.unit_cost_eur = parsed.data.unitCostEur;
  } else if (parsed.data.purchaseTotalEur !== undefined) {
    patch.unit_cost_eur =
      nextQty > 0 ? parsed.data.purchaseTotalEur / nextQty : null;
  }

  let { data: item, error } = await supabase
    .from("inventory_items")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (
    error &&
    isMissingUnitCostColumn(error) &&
    "unit_cost_eur" in patch
  ) {
    const { unit_cost_eur: _drop, ...rest } = patch;
    const retry = await supabase
      .from("inventory_items")
      .update(rest)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    item = retry.data;
    error = retry.error;
  }

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  if (!item) {
    return Response.json({ error: "Item not found" }, { status: 404 });
  }

  return Response.json(mapInventoryItem(item as Record<string, unknown>));
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const session = await getSessionFromRequest(_req);
  const denied = requireBoss(session);
  if (denied) return denied;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("inventory_items")
    .select("id")
    .eq("id", id)
    .eq("company_id", session!.companyId!)
    .maybeSingle();

  if (!existing) {
    return Response.json({ error: "Артикулът не е намерен." }, { status: 404 });
  }

  const { error } = await supabase.from("inventory_items").delete().eq("id", id);
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return new Response(null, { status: 204 });
}

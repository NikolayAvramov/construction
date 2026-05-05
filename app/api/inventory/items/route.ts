import { z } from "zod";
import { UserRole } from "@/lib/enums";
import { getSessionFromRequest } from "@/lib/auth";
import { requireBoss } from "@/lib/rbac";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const itemCreateSchema = z.object({
  name: z.string().min(1),
  quantity: z.coerce.number().nonnegative(),
  unit: z.string().min(1),
  /** Цена за 1 единица в EUR (приоритет пред purchaseTotalEur). */
  unitCostEur: z.coerce.number().nonnegative().optional(),
  /** Общо платено за това количество — изчислява се unit_cost = total / quantity. */
  purchaseTotalEur: z.coerce.number().nonnegative().optional(),
});

export function mapInventoryItem(row: Record<string, unknown>) {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    quantity: row.quantity,
    unit: row.unit,
    unitCostEur: row.unit_cost_eur ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Липсваща колона в Supabase преди migration — PostgREST/Postgres съобщения. */
export function isMissingUnitCostColumn(
  err: { message?: string; code?: string } | null
): boolean {
  const m = (err?.message ?? "").toLowerCase();
  return (
    m.includes("unit_cost_eur") ||
    m.includes("schema cache") ||
    err?.code === "42703"
  );
}

function resolveUnitCostEur(args: {
  quantity: number;
  unitCostEur?: number;
  purchaseTotalEur?: number;
}): number | null {
  if (
    args.unitCostEur !== undefined &&
    Number.isFinite(args.unitCostEur)
  ) {
    return args.unitCostEur;
  }
  if (
    args.purchaseTotalEur !== undefined &&
    Number.isFinite(args.purchaseTotalEur) &&
    args.quantity > 0
  ) {
    return args.purchaseTotalEur / args.quantity;
  }
  return null;
}

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== UserRole.BOSS && session.role !== UserRole.FOREMAN) {
    return Response.json(
      { error: "Нямате достъп до склада." },
      { status: 403 }
    );
  }
  if (!session.companyId) {
    return Response.json({ error: "No company" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: items, error } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("company_id", session.companyId)
    .order("name", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(
    (items ?? []).map((r) => mapInventoryItem(r as Record<string, unknown>))
  );
}

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  const denied = requireBoss(session);
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const parsed = itemCreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const unitCost = resolveUnitCostEur({
    quantity: parsed.data.quantity,
    unitCostEur: parsed.data.unitCostEur,
    purchaseTotalEur: parsed.data.purchaseTotalEur,
  });

  const supabase = await createClient();
  const baseInsert = {
    name: parsed.data.name,
    quantity: parsed.data.quantity,
    unit: parsed.data.unit,
    company_id: session!.companyId!,
  };
  const insertPayload =
    unitCost !== null
      ? { ...baseInsert, unit_cost_eur: unitCost }
      : baseInsert;

  let { data: item, error } = await supabase
    .from("inventory_items")
    .insert(insertPayload)
    .select("*")
    .single();

  if (
    error &&
    isMissingUnitCostColumn(error) &&
    "unit_cost_eur" in insertPayload
  ) {
    const retry = await supabase
      .from("inventory_items")
      .insert(baseInsert)
      .select("*")
      .single();
    item = retry.data;
    error = retry.error;
  }

  if (error || !item) {
    return Response.json({ error: error?.message ?? "Create failed" }, { status: 500 });
  }

  return Response.json(
    mapInventoryItem(item as Record<string, unknown>),
    { status: 201 }
  );
}

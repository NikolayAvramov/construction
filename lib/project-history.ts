import { formatEur } from "@/lib/format-currency";
import { expenseCategoryBg, projectStatusBg } from "@/lib/ui-labels";
import type { createClient } from "@/utils/supabase/server";

export type ProjectHistoryItem = {
  id: string;
  kind: string;
  title: string;
  detail: string | null;
  amountEur: number | null;
  occurredAt: string;
  actorName: string | null;
};

type Supabase = Awaited<ReturnType<typeof createClient>>;

const FIELD_LABELS: Record<string, string> = {
  name: "Наименование",
  location: "Локация",
  total_price: "Договорна стойност",
  advance_payment: "Аванс",
  advance_amount: "Сума аванс",
  status: "Статус",
};

function formatFieldValue(field: string, value: unknown): string {
  if (value == null || value === "") return "—";
  if (field === "status") return projectStatusBg(String(value));
  if (field === "advance_payment") return value ? "Да" : "Не";
  if (field === "total_price" || field === "advance_amount") {
    const n = Number(value);
    return Number.isFinite(n) ? formatEur(n) : String(value);
  }
  return String(value);
}

/** Описание на промени при PATCH на обект */
export function describeProjectPatch(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): string | null {
  const fields = [
    "name",
    "location",
    "total_price",
    "advance_payment",
    "advance_amount",
    "status",
  ] as const;
  const lines: string[] = [];
  for (const f of fields) {
    const a = before[f];
    const b = after[f];
    if (String(a ?? "") === String(b ?? "")) continue;
    lines.push(
      `${FIELD_LABELS[f]}: ${formatFieldValue(f, a)} → ${formatFieldValue(f, b)}`
    );
  }
  return lines.length > 0 ? lines.join(" · ") : null;
}

export async function insertProjectEvent(
  supabase: Supabase,
  row: {
    companyId: string;
    projectId: string | null;
    projectName: string;
    actorId: string | null;
    actorName: string | null;
    kind: string;
    title: string;
    detail?: string | null;
    amountEur?: number | null;
    occurredAt?: string;
  }
) {
  const { error } = await supabase.from("project_events").insert({
    company_id: row.companyId,
    project_id: row.projectId,
    project_name: row.projectName,
    actor_id: row.actorId,
    actor_name: row.actorName,
    kind: row.kind,
    title: row.title,
    detail: row.detail ?? null,
    amount_eur: row.amountEur ?? null,
    occurred_at: row.occurredAt ?? new Date().toISOString(),
  });
  if (error) console.error("[project_events]", error.message);
}

export async function fetchProjectHistory(
  supabase: Supabase,
  projectId: string,
  options: { includeFinance: boolean }
): Promise<ProjectHistoryItem[]> {
  const items: ProjectHistoryItem[] = [];

  const { data: events } = await supabase
    .from("project_events")
    .select(
      "id, kind, title, detail, amount_eur, occurred_at, actor_name"
    )
    .eq("project_id", projectId)
    .order("occurred_at", { ascending: false });

  for (const e of events ?? []) {
    items.push({
      id: `ev-${e.id}`,
      kind: e.kind as string,
      title: e.title as string,
      detail: (e.detail as string | null) ?? null,
      amountEur:
        e.amount_eur != null ? Number(e.amount_eur) : null,
      occurredAt: e.occurred_at as string,
      actorName: (e.actor_name as string | null) ?? null,
    });
  }

  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount, date, description, created_at")
    .eq("project_id", projectId)
    .order("date", { ascending: false });

  if (options.includeFinance) {
    for (const p of payments ?? []) {
      items.push({
        id: `pay-${p.id}`,
        kind: "PAYMENT",
        title: "Постъпило плащане",
        detail: (p.description as string | null) ?? null,
        amountEur: Number(p.amount),
        occurredAt: `${p.date}T12:00:00.000Z`,
        actorName: null,
      });
    }

    const { data: expenses } = await supabase
      .from("expenses")
      .select("id, amount, date, category, description, created_at")
      .eq("project_id", projectId)
      .order("date", { ascending: false });

    for (const ex of expenses ?? []) {
      items.push({
        id: `exp-${ex.id}`,
        kind: "EXPENSE",
        title: `Разход · ${expenseCategoryBg(ex.category as string)}`,
        detail: (ex.description as string | null) ?? null,
        amountEur: Number(ex.amount),
        occurredAt: `${ex.date}T12:00:00.000Z`,
        actorName: null,
      });
    }
  }

  const { data: moves } = await supabase
    .from("material_movements")
    .select(
      "id, quantity, note, created_at, inventory_item:inventory_items(name, unit)"
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  for (const m of moves ?? []) {
    const item = m.inventory_item as
      | { name: string; unit: string }
      | { name: string; unit: string }[]
      | null;
    const inv = Array.isArray(item) ? item[0] : item;
    const name = inv?.name ?? "Материал";
    const unit = inv?.unit ?? "";
    items.push({
      id: `mov-${m.id}`,
      kind: "MATERIAL",
      title: `Материал към обекта · ${name}`,
      detail:
        [(m.note as string | null) ?? null, `${m.quantity} ${unit}`]
          .filter(Boolean)
          .join(" · ") || null,
      amountEur: null,
      occurredAt: m.created_at as string,
      actorName: null,
    });
  }

  const { data: daily } = await supabase
    .from("daily_work_entries")
    .select("id, date, tasks_completed, notes, created_at")
    .eq("project_id", projectId)
    .order("date", { ascending: false });

  for (const d of daily ?? []) {
    const parts = [
      (d.tasks_completed as string)?.trim(),
      (d.notes as string)?.trim(),
    ].filter(Boolean);
    items.push({
      id: `dw-${d.id}`,
      kind: "DAILY_WORK",
      title: "Дневник на обекта",
      detail: parts.length > 0 ? parts.join(" · ") : null,
      amountEur: null,
      occurredAt: `${d.date}T12:00:00.000Z`,
      actorName: null,
    });
  }

  items.sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );

  return items;
}

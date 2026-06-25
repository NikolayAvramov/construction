"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AuthUser } from "@/lib/types";
import { apiJson } from "@/lib/client-api";
import {
  btnPrimaryBlue,
  inputBase,
  labelText,
  listCard,
  panel,
} from "@/lib/ui-classes";
import { AddButton } from "@/components/ui/add-button";
import { FlashMessages } from "@/components/ui/flash-messages";
import { FormSheet } from "@/components/ui/form-sheet";
import { PageHeader } from "@/components/ui/page-header";

type ProjectMini = {
  id: string;
  name: string;
  location: string;
  status: string;
};

type InvItem = {
  id: string;
  name: string;
  quantity: string | number;
  unit: string;
};

type Movement = {
  id: string;
  quantity: string;
  createdAt: string;
  note: string | null;
  item: { name: string; unit: string };
};

function normalizeMovement(raw: Record<string, unknown>): Movement {
  const itemRaw = raw.item as Record<string, unknown> | undefined | null;
  return {
    id: String(raw.id),
    quantity: String(raw.quantity ?? ""),
    createdAt: String(raw.created_at ?? ""),
    note: raw.note != null && String(raw.note) !== "" ? String(raw.note) : null,
    item: {
      name: String(itemRaw?.name ?? "—"),
      unit: String(itemRaw?.unit ?? ""),
    },
  };
}

export default function MaterialsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [projects, setProjects] = useState<ProjectMini[]>([]);
  const [projectId, setProjectId] = useState<string>("");
  const [items, setItems] = useState<InvItem[]>([]);
  const [rows, setRows] = useState<Movement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState(false);

  const [inventoryItemId, setInventoryItemId] = useState("");
  const [moveQty, setMoveQty] = useState("");
  const [moveNote, setMoveNote] = useState("");
  const [sheetMove, setSheetMove] = useState(false);

  const loadMovements = useCallback(async () => {
    if (!projectId) return;
    const raw = await apiJson<Record<string, unknown>[]>(
      `/api/inventory/movements?projectId=${encodeURIComponent(projectId)}`
    );
    setRows(raw.map(normalizeMovement));
  }, [projectId]);

  const loadItems = useCallback(async () => {
    const list = await apiJson<InvItem[]>("/api/inventory/items");
    setItems(list);
    setInventoryItemId((prev) => {
      if (prev && list.some((i) => i.id === prev)) return prev;
      return list[0]?.id ?? "";
    });
  }, []);

  useEffect(() => {
    apiJson<AuthUser>("/api/auth/me").then(setUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    apiJson<ProjectMini[]>("/api/projects")
      .then((list) => {
        setProjects(list);
        if (list[0]) setProjectId(list[0].id);
      })
      .catch((e: Error) => setError(e.message));
  }, [user]);

  useEffect(() => {
    if (!user || (user.role !== "BOSS" && user.role !== "FOREMAN")) return;
    loadItems().catch((e: Error) => setError(e.message));
  }, [user, loadItems]);

  useEffect(() => {
    if (!projectId) return;
    void loadMovements().catch((e: Error) => setError(e.message));
  }, [projectId, loadMovements]);

  const selectedItem = useMemo(
    () => items.find((i) => i.id === inventoryItemId),
    [items, inventoryItemId]
  );

  const stockNum = selectedItem
    ? Number(String(selectedItem.quantity).replace(",", "."))
    : NaN;

  async function submitMove(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    if (!projectId || !inventoryItemId) {
      setError("Изберете обект и материал.");
      return;
    }
    const q = Number(moveQty.replace(",", "."));
    if (!Number.isFinite(q) || q <= 0) {
      setError("Въведете положително количество.");
      return;
    }
    if (Number.isFinite(stockNum) && q > stockNum) {
      setError(
        `Недостатъчна наличност. В склада има ${String(selectedItem?.quantity)} ${selectedItem?.unit ?? ""}.`
      );
      return;
    }
    setPendingMove(true);
    try {
      await apiJson("/api/inventory/move", {
        method: "POST",
        body: JSON.stringify({
          inventoryItemId,
          projectId,
          quantity: q,
          note: moveNote.trim() || undefined,
        }),
      });
      setMsg("Материалът е отчетен към обекта и наличността в склада е намалена.");
      setMoveQty("");
      setMoveNote("");
      setSheetMove(false);
      await loadItems();
      await loadMovements();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Грешка при движението.");
    } finally {
      setPendingMove(false);
    }
  }

  if (!user) {
    return <p className="text-slate-500">Зареждане…</p>;
  }

  if (user.role !== "BOSS" && user.role !== "FOREMAN") {
    return (
      <p className="text-slate-600">
        Този раздел е за управител или бригадир.
      </p>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Материали към обект"
        description="История на отчисленията по обект. Ново отчисляване — от бутона вдясно."
      >
        <AddButton
          onClick={() => setSheetMove(true)}
          disabled={items.length === 0 || !projectId}
        >
          Отчисли материал
        </AddButton>
      </PageHeader>

      {projects.length > 0 ? (
        <label className="block">
          <span className="text-xs font-semibold text-slate-700">Обект</span>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-base shadow-sm"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
          Няма обекти — добавете от раздел „Обекти“.
        </p>
      )}

      {items.length === 0 ? (
        <div className={panel}>
          <p className="text-sm font-semibold text-slate-800">Складът е празен</p>
          <p className="mt-2 text-sm text-slate-600">
            {user.role === "BOSS"
              ? "Добавете артикули от раздел „Склад“, след което ще можете да ги отчислявате към обекти."
              : "Помолете управителя да зареди склада с материали."}
          </p>
        </div>
      ) : null}

      <FlashMessages success={msg} error={error} />

      <FormSheet
        open={sheetMove}
        onClose={() => setSheetMove(false)}
        title="Отчисли от склад"
        description="Количеството се изважда от общата наличност във фирмения склад."
      >
        <form onSubmit={submitMove} className="space-y-3">
          <label className="block">
            <span className={labelText}>Материал (наличност)</span>
            <select
              value={inventoryItemId}
              onChange={(e) => setInventoryItemId(e.target.value)}
              className={inputBase}
              disabled={!projectId}
            >
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} — {i.quantity} {i.unit} в склад
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelText}>Количество за обекта</span>
            <input
              value={moveQty}
              onChange={(e) => setMoveQty(e.target.value)}
              className={`${inputBase} tabular-nums`}
              inputMode="decimal"
              placeholder={`напр. 5 ${selectedItem?.unit ?? ""}`}
              disabled={!projectId}
              autoFocus
            />
          </label>
          <label className="block">
            <span className={labelText}>Бележка (по желание)</span>
            <input
              value={moveNote}
              onChange={(e) => setMoveNote(e.target.value)}
              className={inputBase}
              placeholder="напр. за първи етаж"
              disabled={!projectId}
            />
          </label>
          <button
            type="submit"
            disabled={pendingMove || !projectId}
            className={btnPrimaryBlue}
          >
            {pendingMove ? "Запис…" : "Потвърди отчисляване"}
          </button>
        </form>
      </FormSheet>

      <div>
        <h2 className="text-sm font-semibold text-slate-800">
          История за този обект
        </h2>
        {!projectId ? null : rows.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
            Все още няма отчислени материали към този обект.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {rows.map((r) => (
              <li key={r.id} className={listCard}>
                <p className="font-semibold text-slate-900">
                  {r.item.name}{" "}
                  <span className="font-normal tabular-nums text-slate-700">
                    −{r.quantity} {r.item.unit}
                  </span>
                </p>
                {r.note ? (
                  <p className="mt-1 text-sm text-slate-600">{r.note}</p>
                ) : null}
                <p className="mt-1 text-xs text-slate-500">
                  {r.createdAt
                    ? new Date(r.createdAt).toLocaleString("bg-BG")
                    : "—"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

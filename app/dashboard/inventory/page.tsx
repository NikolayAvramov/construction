"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthUser } from "@/lib/types";
import { apiJson } from "@/lib/client-api";
import { formatEur } from "@/lib/format-currency";

type Item = {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  unitCostEur: string | number | null;
};

const panel =
  "rounded-xl border border-slate-200/90 bg-white p-6 shadow-sm";
const btnSecondary =
  "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50";
const btnDanger =
  "rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100";

function parseOptionalEuro(raw: string): number | undefined {
  const t = raw.trim().replace(",", ".");
  if (t === "") return undefined;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

function lineStockEur(qty: string, unitCost: string | number | null): number | null {
  if (unitCost === null || unitCost === "") return null;
  const q = Number(String(qty).replace(",", "."));
  const u = Number(String(unitCost).replace(",", "."));
  if (!Number.isFinite(q) || !Number.isFinite(u)) return null;
  return q * u;
}

export default function InventoryPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [newName, setNewName] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newUnit, setNewUnit] = useState("бр.");
  const [newUnitCostEur, setNewUnitCostEur] = useState("");
  const [newPurchaseTotalEur, setNewPurchaseTotalEur] = useState("");

  const [editId, setEditId] = useState<string | null>(null);
  const [eName, setEName] = useState("");
  const [eQty, setEQty] = useState("");
  const [eUnit, setEUnit] = useState("");
  const [eUnitCostEur, setEUnitCostEur] = useState("");
  const [ePurchaseTotalEur, setEPurchaseTotalEur] = useState("");

  useEffect(() => {
    apiJson<AuthUser>("/api/auth/me").then((u) => {
      setUser(u);
      if (u.role !== "BOSS") router.replace("/dashboard/materials");
    });
  }, [router]);

  async function refresh() {
    const list = await apiJson<Item[]>("/api/inventory/items");
    setItems(list);
  }

  useEffect(() => {
    if (!user || user.role !== "BOSS") return;
    apiJson<Item[]>("/api/inventory/items")
      .then(setItems)
      .catch((e: Error) => setError(e.message));
  }, [user]);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    setPending(true);
    try {
      const quantity = Number(newQty.replace(",", "."));
      if (!Number.isFinite(quantity) || quantity < 0) {
        setError("Въведете валидно количество.");
        return;
      }
      const unitCost = parseOptionalEuro(newUnitCostEur);
      const purchaseTotal = parseOptionalEuro(newPurchaseTotalEur);
      if (
        newUnitCostEur.trim() !== "" &&
        unitCost === undefined
      ) {
        setError("Невалидна цена за единица (EUR).");
        return;
      }
      if (
        newPurchaseTotalEur.trim() !== "" &&
        purchaseTotal === undefined
      ) {
        setError("Невалидно общо платено (EUR).");
        return;
      }
      const body: Record<string, unknown> = {
        name: newName.trim(),
        quantity,
        unit: newUnit.trim() || "бр.",
      };
      if (unitCost !== undefined) body.unitCostEur = unitCost;
      if (purchaseTotal !== undefined) body.purchaseTotalEur = purchaseTotal;

      await apiJson("/api/inventory/items", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setNewName("");
      setNewQty("");
      setNewUnit("бр.");
      setNewUnitCostEur("");
      setNewPurchaseTotalEur("");
      setMsg("Артикулът е добавен в склада.");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Грешка");
    } finally {
      setPending(false);
    }
  }

  async function saveItem(id: string) {
    setError(null);
    setMsg(null);
    try {
      const quantity = Number(eQty.replace(",", "."));
      if (!Number.isFinite(quantity) || quantity < 0) {
        setError("Невалидно количество.");
        return;
      }
      const ut = eUnitCostEur.trim();
      const pt = ePurchaseTotalEur.trim();
      const unitCostParsed =
        ut === "" ? undefined : parseOptionalEuro(eUnitCostEur);
      const purchaseParsed =
        pt === "" ? undefined : parseOptionalEuro(ePurchaseTotalEur);
      if (ut !== "" && unitCostParsed === undefined) {
        setError("Невалидна цена за единица (EUR).");
        return;
      }
      if (pt !== "" && purchaseParsed === undefined) {
        setError("Невалидно общо платено (EUR).");
        return;
      }

      const body: Record<string, unknown> = {
        name: eName.trim(),
        quantity,
        unit: eUnit.trim() || "бр.",
      };
      if (pt !== "" && purchaseParsed !== undefined) {
        body.purchaseTotalEur = purchaseParsed;
      } else if (ut !== "" && unitCostParsed !== undefined) {
        body.unitCostEur = unitCostParsed;
      } else if (ut === "" && pt === "") {
        body.unitCostEur = null;
      }

      await apiJson(`/api/inventory/items/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setEditId(null);
      setMsg("Артикулът е обновен.");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Грешка");
    }
  }

  async function deleteItem(id: string) {
    if (!confirm("Изтриване на артикула от склада?")) return;
    setError(null);
    try {
      await apiJson(`/api/inventory/items/${id}`, { method: "DELETE" });
      setMsg("Артикулът е изтрит.");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Грешка");
    }
  }

  if (!user || user.role !== "BOSS") {
    return null;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Склад
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Добавяйте и редактирайте материали и наличности.           Цените са в{" "}
          <span className="font-semibold text-slate-800">евро (EUR)</span>
          — цена за единица или общо платено за въведеното количество.
        </p>
      </div>

      <form onSubmit={addItem} className={panel}>
        <h2 className="text-sm font-semibold text-slate-900">Нов артикул</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold text-slate-700">
              Наименование
            </span>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm shadow-sm"
              required
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">
              Количество
            </span>
            <input
              value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm shadow-sm tabular-nums"
              required
              inputMode="decimal"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">
              Мерна единица
            </span>
            <input
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm shadow-sm"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold text-slate-700">
              Цена за 1 единица (EUR)
            </span>
            <input
              value={newUnitCostEur}
              onChange={(e) => setNewUnitCostEur(e.target.value)}
              placeholder="напр. 12,50"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm shadow-sm tabular-nums"
              inputMode="decimal"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold text-slate-700">
              Или общо платено за това количество (EUR)
            </span>
            <input
              value={newPurchaseTotalEur}
              onChange={(e) => setNewPurchaseTotalEur(e.target.value)}
              placeholder="напр. закупихте 1000 кг за 240 €"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm shadow-sm tabular-nums"
              inputMode="decimal"
            />
            <span className="mt-1 block text-[11px] text-slate-500">
              Ако попълните и двете, ползва се цената за единица.
            </span>
          </label>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="mt-4 w-full rounded-lg bg-slate-900 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
        >
          {pending ? "Запис…" : "Добави в склад"}
        </button>
      </form>

      {msg ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {msg}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <ul className="space-y-3">
        {items.map((i) => {
          const line = lineStockEur(i.quantity, i.unitCostEur);
          return (
            <li
              key={i.id}
              className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm"
            >
              {editId === i.id ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={eName}
                    onChange={(e) => setEName(e.target.value)}
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm sm:col-span-2"
                  />
                  <input
                    value={eQty}
                    onChange={(e) => setEQty(e.target.value)}
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm tabular-nums"
                  />
                  <input
                    value={eUnit}
                    onChange={(e) => setEUnit(e.target.value)}
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  />
                  <label className="block sm:col-span-2">
                    <span className="text-[11px] font-semibold text-slate-600">
                      Цена за 1 {eUnit.trim() || "ед."} (EUR)
                    </span>
                    <input
                      value={eUnitCostEur}
                      onChange={(e) => setEUnitCostEur(e.target.value)}
                      className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm tabular-nums"
                      inputMode="decimal"
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="text-[11px] font-semibold text-slate-600">
                      Или ново общо платено за текущото количество (EUR)
                    </span>
                    <input
                      value={ePurchaseTotalEur}
                      onChange={(e) => setEPurchaseTotalEur(e.target.value)}
                      className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm tabular-nums"
                      inputMode="decimal"
                    />
                    <span className="mt-0.5 block text-[10px] text-slate-500">
                      Празни двете ценови полета, за да махнете запазената цена.
                    </span>
                  </label>
                  <div className="flex gap-2 sm:col-span-2">
                    <button
                      type="button"
                      className={btnSecondary}
                      onClick={() => void saveItem(i.id)}
                    >
                      Запази
                    </button>
                    <button
                      type="button"
                      className={btnSecondary}
                      onClick={() => setEditId(null)}
                    >
                      Отказ
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{i.name}</p>
                    <p className="text-sm text-slate-600">
                      Мерна единица: {i.unit}
                    </p>
                    {i.unitCostEur != null && String(i.unitCostEur) !== "" ? (
                      <p className="mt-1 text-sm text-slate-600">
                        Цена за единица:{" "}
                        <span className="font-medium tabular-nums text-slate-800">
                          {formatEur(i.unitCostEur, 4)}
                        </span>
                      </p>
                    ) : null}
                    {line != null ? (
                      <p className="mt-0.5 text-sm font-medium text-slate-800">
                        Стойност на наличност:{" "}
                        <span className="tabular-nums text-emerald-800">
                          {formatEur(line, 2)}
                        </span>
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
                    <p className="text-lg font-bold tabular-nums text-slate-900">
                      {i.quantity}{" "}
                      <span className="text-sm font-semibold text-slate-500">
                        {i.unit}
                      </span>
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className={btnSecondary}
                        onClick={() => {
                          setEditId(i.id);
                          setEName(i.name);
                          setEQty(String(i.quantity));
                          setEUnit(i.unit);
                          setEUnitCostEur(
                            i.unitCostEur != null && String(i.unitCostEur) !== ""
                              ? String(i.unitCostEur).replace(".", ",")
                              : ""
                          );
                          setEPurchaseTotalEur("");
                        }}
                      >
                        Редактирай
                      </button>
                      <button
                        type="button"
                        className={btnDanger}
                        onClick={() => void deleteItem(i.id)}
                      >
                        Изтрий
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

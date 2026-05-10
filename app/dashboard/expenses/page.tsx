"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthUser } from "@/lib/types";
import { apiJson } from "@/lib/client-api";
import { formatEur } from "@/lib/format-currency";
import { expenseCategoryBg, EXPENSE_CATEGORY_OPTIONS } from "@/lib/ui-labels";

type ProjectMini = { id: string; name: string };
type ExpenseRow = {
  id: string;
  amount: string;
  date: string;
  category: string;
  description: string | null;
  projectId?: string;
  project?: { id: string; name: string };
};
type PaymentRow = {
  id: string;
  amount: string;
  date: string;
  description: string | null;
  projectId: string;
  project?: { id: string; name: string };
};

const panel =
  "rounded-xl border border-slate-200/90 bg-white p-6 shadow-sm";
const btnSecondary =
  "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50";
const btnDanger =
  "rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100";

type Tab = "expenses" | "payments";

type PendingSalaryItem = {
  workerId: string;
  name: string;
  projectId: string;
  projectName: string;
  workDays: number;
  nadnik: number;
  amount: number;
  year: number;
  month: number;
  paid: boolean;
};

function currentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function shiftYearMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthTitleBg(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("bg-BG", {
    month: "long",
    year: "numeric",
  });
}

export default function ExpensesPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [projects, setProjects] = useState<ProjectMini[]>([]);
  const [tab, setTab] = useState<Tab>("expenses");
  const [expRows, setExpRows] = useState<ExpenseRow[]>([]);
  const [payRows, setPayRows] = useState<PaymentRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [projectId, setProjectId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [category, setCategory] = useState("MATERIALS");
  const [description, setDescription] = useState("");

  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [payDesc, setPayDesc] = useState("");
  const [payProjectId, setPayProjectId] = useState("");

  const [editExpId, setEditExpId] = useState<string | null>(null);
  const [eeAmount, setEeAmount] = useState("");
  const [eeDate, setEeDate] = useState("");
  const [eeCat, setEeCat] = useState("MATERIALS");
  const [eeProj, setEeProj] = useState("");
  const [eeDesc, setEeDesc] = useState("");

  const [editPayId, setEditPayId] = useState<string | null>(null);
  const [epAmount, setEpAmount] = useState("");
  const [epDate, setEpDate] = useState("");
  const [epProj, setEpProj] = useState("");
  const [epDesc, setEpDesc] = useState("");

  const [salaryYm, setSalaryYm] = useState(currentYearMonth);
  const [salaryItems, setSalaryItems] = useState<PendingSalaryItem[]>([]);
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [salaryPayingId, setSalaryPayingId] = useState<string | null>(null);

  const loadPendingSalaries = useCallback(async () => {
    if (!user || user.role !== "BOSS") return;
    const [y, m] = salaryYm.split("-").map(Number);
    setSalaryLoading(true);
    try {
      const r = await apiJson<{ items: PendingSalaryItem[] }>(
        `/api/finance/pending-salaries?year=${y}&month=${m}`
      );
      setSalaryItems(r.items);
    } catch {
      setSalaryItems([]);
    } finally {
      setSalaryLoading(false);
    }
  }, [user, salaryYm]);

  useEffect(() => {
    apiJson<AuthUser>("/api/auth/me").then((u) => {
      setUser(u);
      if (u.role !== "BOSS") router.replace("/dashboard");
    });
  }, [router]);

  useEffect(() => {
    if (!user || user.role !== "BOSS") return;
    apiJson<ProjectMini[]>("/api/projects").then((list) => {
      setProjects(list);
      if (list[0] && !payProjectId) setPayProjectId(list[0].id);
    });
  }, [user]);

  async function refreshExp() {
    const list = await apiJson<ExpenseRow[]>("/api/finance/expenses");
    setExpRows(list);
  }
  async function refreshPay() {
    const list = await apiJson<PaymentRow[]>("/api/finance/payments");
    setPayRows(list);
  }

  useEffect(() => {
    if (!user || user.role !== "BOSS") return;
    void refreshExp();
    void refreshPay();
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== "BOSS" || tab !== "expenses") return;
    void loadPendingSalaries();
  }, [user, tab, loadPendingSalaries]);

  async function payWorkerSalary(workerId: string) {
    const [y, m] = salaryYm.split("-").map(Number);
    setErr(null);
    setMsg(null);
    setSalaryPayingId(workerId);
    try {
      await apiJson("/api/finance/pay-worker-salary", {
        method: "POST",
        body: JSON.stringify({
          workerId,
          year: y,
          month: m,
          date: new Date().toISOString().slice(0, 10),
        }),
      });
      setMsg("Заплатата е записана като разход (заплати).");
      await refreshExp();
      await loadPendingSalaries();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Грешка при плащане");
    } finally {
      setSalaryPayingId(null);
    }
  }

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setPending(true);
    try {
      const n = Number(amount.replace(",", "."));
      if (!Number.isFinite(n) || n <= 0) {
        setErr("Въведете валидна сума.");
        return;
      }
      await apiJson("/api/finance/expenses", {
        method: "POST",
        body: JSON.stringify({
          amount: n,
          date,
          category,
          ...(projectId.trim() !== "" ? { projectId: projectId.trim() } : {}),
          description: description.trim() || undefined,
        }),
      });
      setAmount("");
      setDescription("");
      setMsg("Разходът е записан.");
      await refreshExp();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Грешка");
    } finally {
      setPending(false);
    }
  }

  async function addPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payProjectId) return;
    setErr(null);
    setMsg(null);
    setPending(true);
    try {
      const n = Number(payAmount.replace(",", "."));
      if (!Number.isFinite(n) || n <= 0) {
        setErr("Въведете валидна сума.");
        return;
      }
      await apiJson("/api/finance/payments", {
        method: "POST",
        body: JSON.stringify({
          amount: n,
          date: payDate,
          projectId: payProjectId,
          description: payDesc.trim() || undefined,
        }),
      });
      setPayAmount("");
      setPayDesc("");
      setMsg("Плащането е записано.");
      await refreshPay();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Грешка");
    } finally {
      setPending(false);
    }
  }

  async function saveExpense(id: string) {
    setErr(null);
    try {
      const n = Number(eeAmount.replace(",", "."));
      if (!Number.isFinite(n) || n <= 0) {
        setErr("Невалидна сума.");
        return;
      }
      await apiJson(`/api/finance/expenses/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          amount: n,
          date: eeDate,
          category: eeCat,
          projectId: eeProj.trim() === "" ? null : eeProj.trim(),
          description: eeDesc.trim() || null,
        }),
      });
      setEditExpId(null);
      setMsg("Разходът е обновен.");
      await refreshExp();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Грешка");
    }
  }

  async function delExpense(id: string) {
    if (!confirm("Изтриване на разхода?")) return;
    setErr(null);
    try {
      await apiJson(`/api/finance/expenses/${id}`, { method: "DELETE" });
      await refreshExp();
      setMsg("Разходът е изтрит.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Грешка");
    }
  }

  async function savePayment(id: string) {
    setErr(null);
    try {
      const n = Number(epAmount.replace(",", "."));
      if (!Number.isFinite(n) || n <= 0) {
        setErr("Невалидна сума.");
        return;
      }
      await apiJson(`/api/finance/payments/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          amount: n,
          date: epDate,
          projectId: epProj,
          description: epDesc.trim() || null,
        }),
      });
      setEditPayId(null);
      setMsg("Плащането е обновено.");
      await refreshPay();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Грешка");
    }
  }

  async function delPayment(id: string) {
    if (!confirm("Изтриване на плащането?")) return;
    setErr(null);
    try {
      await apiJson(`/api/finance/payments/${id}`, { method: "DELETE" });
      await refreshPay();
      setMsg("Плащането е изтрито.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Грешка");
    }
  }

  if (!user || user.role !== "BOSS") {
    return null;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold tracking-tight text-slate-900">
        Финанси
      </h1>
      <div className="flex gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1">
        <button
          type="button"
          onClick={() => setTab("expenses")}
          className={`flex-1 rounded-md py-2 text-sm font-semibold ${
            tab === "expenses"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600"
          }`}
        >
          Разходи
        </button>
        <button
          type="button"
          onClick={() => setTab("payments")}
          className={`flex-1 rounded-md py-2 text-sm font-semibold ${
            tab === "payments"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600"
          }`}
        >
          Плащания
        </button>
      </div>

      {msg ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {msg}
        </p>
      ) : null}
      {err ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {err}
        </p>
      ) : null}

      {tab === "expenses" ? (
        <>
          <section className={panel}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Заплати на работници
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  По надник и записани присъствия за месеца. „Плати“ записва разход
                  и отбелязва месеца като платен — в месечния календар се показва
                  „Платено“. Платените редове остават в списъка със статус (не се
                  плаща втори път).
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSalaryYm((y) => shiftYearMonth(y, -1))}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                  aria-label="Предишен месец"
                >
                  ←
                </button>
                <span className="min-w-[10rem] text-center text-sm font-semibold capitalize text-slate-800">
                  {monthTitleBg(salaryYm)}
                </span>
                <button
                  type="button"
                  onClick={() => setSalaryYm((y) => shiftYearMonth(y, 1))}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                  aria-label="Следващ месец"
                >
                  →
                </button>
              </div>
            </div>

            {salaryLoading ? (
              <p className="mt-4 text-sm text-slate-500">Зареждане…</p>
            ) : salaryItems.length === 0 ? (
              <p className="mt-4 rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-500">
                Няма изчислени заплати за този месец (надник и поне един ден
                присъствие).
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[32rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      <th className="px-3 py-2">Работник</th>
                      <th className="px-3 py-2">Обект</th>
                      <th className="px-3 py-2 text-right tabular-nums">Дни</th>
                      <th className="px-3 py-2 text-right tabular-nums">Надник</th>
                      <th className="px-3 py-2 text-right tabular-nums">Сума</th>
                      <th className="px-3 py-2">Действие</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salaryItems.map((row) => (
                      <tr
                        key={row.workerId}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-3 py-2.5 font-medium text-slate-900">
                          {row.name}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">
                          {row.projectName}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-slate-800">
                          {row.workDays}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                          {formatEur(row.nadnik)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-slate-900">
                          {formatEur(row.amount)}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {row.paid ? (
                            <span className="inline-flex rounded-md border border-emerald-500/70 bg-emerald-50 px-2 py-1 text-xs font-bold uppercase tracking-wide text-emerald-900">
                              Платено
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void payWorkerSalary(row.workerId)}
                              disabled={salaryPayingId !== null}
                              className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
                            >
                              {salaryPayingId === row.workerId
                                ? "Запис…"
                                : "Плати"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <form onSubmit={addExpense} className={panel}>
            <h2 className="text-sm font-semibold text-slate-900">Нов разход</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold text-slate-700">
                  Обект <span className="font-normal text-slate-500">(по избор)</span>
                </span>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm shadow-sm"
                >
                  <option value="">
                    — Без обект (фирмен: гориво, осигуровки и др.) —
                  </option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-700">
                  Сума (EUR)
                </span>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm shadow-sm tabular-nums"
                  required
                  inputMode="decimal"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-700">Дата</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm shadow-sm"
                  required
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold text-slate-700">
                  Категория
                </span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm shadow-sm"
                >
                  {EXPENSE_CATEGORY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold text-slate-700">
                  Описание
                </span>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm shadow-sm"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={pending}
              className="mt-4 w-full rounded-lg bg-slate-900 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
            >
              {pending ? "Запис…" : "Добави разход"}
            </button>
          </form>
          <ul className="space-y-3">
            {expRows.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm"
              >
                {editExpId === r.id ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      value={eeAmount}
                      onChange={(e) => setEeAmount(e.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm tabular-nums"
                    />
                    <input
                      type="date"
                      value={eeDate}
                      onChange={(e) => setEeDate(e.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    />
                    <select
                      value={eeCat}
                      onChange={(e) => setEeCat(e.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm sm:col-span-2"
                    >
                      {EXPENSE_CATEGORY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={eeProj}
                      onChange={(e) => setEeProj(e.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm sm:col-span-2"
                    >
                      <option value="">
                        — Без обект (фирмен разход) —
                      </option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <input
                      value={eeDesc}
                      onChange={(e) => setEeDesc(e.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm sm:col-span-2"
                      placeholder="Описание"
                    />
                    <div className="flex gap-2 sm:col-span-2">
                      <button
                        type="button"
                        className={btnSecondary}
                        onClick={() => void saveExpense(r.id)}
                      >
                        Запази
                      </button>
                      <button
                        type="button"
                        className={btnSecondary}
                        onClick={() => setEditExpId(null)}
                      >
                        Отказ
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-bold tabular-nums text-slate-900">
                        {formatEur(r.amount)}
                      </p>
                      <p className="text-sm font-medium text-slate-700">
                        {expenseCategoryBg(r.category)}
                        <span className="font-normal text-slate-500">
                          {" "}
                          ·{" "}
                          {r.project?.name ?? "Без обект (фирмен)"}
                        </span>
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(r.date).toLocaleDateString("bg-BG")}
                      </p>
                      {r.description ? (
                        <p className="mt-1 text-sm text-slate-600">
                          {r.description}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className={btnSecondary}
                        onClick={() => {
                          setEditExpId(r.id);
                          setEeAmount(String(r.amount));
                          setEeDate(r.date);
                          setEeCat(r.category);
                          setEeProj(r.projectId ?? "");
                          setEeDesc(r.description ?? "");
                        }}
                      >
                        Редактирай
                      </button>
                      <button
                        type="button"
                        className={btnDanger}
                        onClick={() => void delExpense(r.id)}
                      >
                        Изтрий
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <form onSubmit={addPayment} className={panel}>
            <h2 className="text-sm font-semibold text-slate-900">Ново плащане</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold text-slate-700">
                  Обект
                </span>
                <select
                  value={payProjectId}
                  onChange={(e) => setPayProjectId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm shadow-sm"
                  required
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-700">
                  Сума (EUR)
                </span>
                <input
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm shadow-sm tabular-nums"
                  required
                  inputMode="decimal"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-700">Дата</span>
                <input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm shadow-sm"
                  required
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold text-slate-700">
                  Описание
                </span>
                <input
                  value={payDesc}
                  onChange={(e) => setPayDesc(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm shadow-sm"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={pending || projects.length === 0}
              className="mt-4 w-full rounded-lg bg-slate-900 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
            >
              {pending ? "Запис…" : "Добави плащане"}
            </button>
          </form>
          <ul className="space-y-3">
            {payRows.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm"
              >
                {editPayId === r.id ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      value={epAmount}
                      onChange={(e) => setEpAmount(e.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm tabular-nums"
                    />
                    <input
                      type="date"
                      value={epDate}
                      onChange={(e) => setEpDate(e.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    />
                    <select
                      value={epProj}
                      onChange={(e) => setEpProj(e.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm sm:col-span-2"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <input
                      value={epDesc}
                      onChange={(e) => setEpDesc(e.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm sm:col-span-2"
                    />
                    <div className="flex gap-2 sm:col-span-2">
                      <button
                        type="button"
                        className={btnSecondary}
                        onClick={() => void savePayment(r.id)}
                      >
                        Запази
                      </button>
                      <button
                        type="button"
                        className={btnSecondary}
                        onClick={() => setEditPayId(null)}
                      >
                        Отказ
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-bold tabular-nums text-emerald-800">
                        +{formatEur(r.amount)}
                      </p>
                      <p className="text-sm text-slate-600">
                        {r.project?.name ?? "Обект"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(r.date).toLocaleDateString("bg-BG")}
                      </p>
                      {r.description ? (
                        <p className="mt-1 text-sm">{r.description}</p>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className={btnSecondary}
                        onClick={() => {
                          setEditPayId(r.id);
                          setEpAmount(String(r.amount));
                          setEpDate(r.date);
                          setEpProj(r.projectId);
                          setEpDesc(r.description ?? "");
                        }}
                      >
                        Редактирай
                      </button>
                      <button
                        type="button"
                        className={btnDanger}
                        onClick={() => void delPayment(r.id)}
                      >
                        Изтрий
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

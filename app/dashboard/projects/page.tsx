"use client";

import { useEffect, useState } from "react";
import type { AuthUser } from "@/lib/types";
import { apiJson } from "@/lib/client-api";
import { projectStatusBg, PROJECT_STATUS_OPTIONS } from "@/lib/ui-labels";

type GroupSummary = { id: string; name: string; workerCount: number };

type ProjectRow = {
  id: string;
  name: string;
  location: string;
  status: string;
  totalPrice?: unknown;
  advancePayment?: boolean;
  advanceAmount?: unknown;
  groups?: GroupSummary[];
  paymentsReceivedTotal?: number;
};

type ForemanProfile = { id: string; name: string; email: string };
type AssignedFm = {
  userId: string;
  id?: string;
  name?: string;
  email?: string;
};

const panel =
  "rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-6";
const btnSecondary =
  "min-h-[44px] rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-xs";
const btnDanger =
  "min-h-[44px] rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-800 hover:bg-red-100 sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-xs";

function formatLv(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  const x = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(x)) return "—";
  return `${new Intl.NumberFormat("bg-BG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(x)}\u00a0лв.`;
}

export default function ProjectsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newTotal, setNewTotal] = useState("");
  const [newAdvance, setNewAdvance] = useState(false);
  const [newAdvanceAmt, setNewAdvanceAmt] = useState("");
  const [newStatus, setNewStatus] = useState("ACTIVE");

  const [allForemen, setAllForemen] = useState<ForemanProfile[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [eName, setEName] = useState("");
  const [eLoc, setELoc] = useState("");
  const [eTotal, setETotal] = useState("");
  const [eAdvance, setEAdvance] = useState(false);
  const [eAdvanceAmt, setEAdvanceAmt] = useState("");
  const [eStatus, setEStatus] = useState("ACTIVE");

  const [fmOpenFor, setFmOpenFor] = useState<string | null>(null);
  const [assignedFm, setAssignedFm] = useState<AssignedFm[]>([]);
  const [addFmUserId, setAddFmUserId] = useState("");

  useEffect(() => {
    apiJson<AuthUser>("/api/auth/me")
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (!user) return;
    apiJson<ProjectRow[]>("/api/projects")
      .then(setProjects)
      .catch((e: Error) => setError(e.message));
    if (user.role === "BOSS") {
      apiJson<ForemanProfile[]>("/api/users/foreman")
        .then(setAllForemen)
        .catch(() => setAllForemen([]));
    }
  }, [user]);

  async function refreshList() {
    const list = await apiJson<ProjectRow[]>("/api/projects");
    setProjects(list);
  }

  async function loadForemen(projectId: string) {
    const list = await apiJson<AssignedFm[]>(`/api/projects/${projectId}/foremen`);
    setAssignedFm(list);
    setAddFmUserId("");
  }

  useEffect(() => {
    if (fmOpenFor) void loadForemen(fmOpenFor);
  }, [fmOpenFor]);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (user?.role !== "BOSS") return;
    setMsg(null);
    setError(null);
    setPending(true);
    try {
      const totalPrice = Number(newTotal.replace(",", "."));
      if (!Number.isFinite(totalPrice) || totalPrice < 0) {
        setError("Въведете валидна договорна стойност.");
        return;
      }
      let advanceAmount: number | null = null;
      if (newAdvance && newAdvanceAmt.trim()) {
        advanceAmount = Number(newAdvanceAmt.replace(",", "."));
        if (!Number.isFinite(advanceAmount) || advanceAmount < 0) {
          setError("Невалидна сума аванс.");
          return;
        }
      }
      await apiJson("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: newName.trim(),
          location: newLocation.trim(),
          totalPrice,
          advancePayment: newAdvance,
          advanceAmount: newAdvance ? advanceAmount : null,
          status: newStatus,
        }),
      });
      setNewName("");
      setNewLocation("");
      setNewTotal("");
      setNewAdvance(false);
      setNewAdvanceAmt("");
      setNewStatus("ACTIVE");
      setMsg("Обектът е добавен.");
      await refreshList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Грешка при запис.");
    } finally {
      setPending(false);
    }
  }

  function startEdit(p: ProjectRow) {
    setEditId(p.id);
    setEName(p.name);
    setELoc(p.location);
    setETotal(String(p.totalPrice ?? ""));
    setEAdvance(!!p.advancePayment);
    setEAdvanceAmt(
      p.advanceAmount != null && String(p.advanceAmount) !== ""
        ? String(p.advanceAmount)
        : ""
    );
    setEStatus(p.status);
  }

  async function saveEdit(projectId: string) {
    setError(null);
    setMsg(null);
    try {
      const totalPrice = Number(eTotal.replace(",", "."));
      if (!Number.isFinite(totalPrice) || totalPrice < 0) {
        setError("Невалидна договорна стойност.");
        return;
      }
      let advanceAmount: number | null = null;
      if (eAdvance && eAdvanceAmt.trim()) {
        advanceAmount = Number(eAdvanceAmt.replace(",", "."));
        if (!Number.isFinite(advanceAmount) || advanceAmount < 0) {
          setError("Невалидна сума аванс.");
          return;
        }
      }
      await apiJson(`/api/projects/${projectId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: eName.trim(),
          location: eLoc.trim(),
          totalPrice,
          advancePayment: eAdvance,
          advanceAmount: eAdvance ? advanceAmount : null,
          status: eStatus,
        }),
      });
      setEditId(null);
      setMsg("Обектът е обновен.");
      await refreshList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Грешка");
    }
  }

  async function deleteProject(projectId: string) {
    if (
      !confirm(
        "Изтриване на обекта? Свързаните данни (групи, разходи и др.) също ще бъдат засегнати според правилата в базата."
      )
    )
      return;
    setError(null);
    try {
      await apiJson(`/api/projects/${projectId}`, { method: "DELETE" });
      setMsg("Обектът е изтрит.");
      setFmOpenFor(null);
      setEditId(null);
      await refreshList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Грешка");
    }
  }

  async function assignForeman(projectId: string) {
    if (!addFmUserId) return;
    setError(null);
    try {
      await apiJson(`/api/projects/${projectId}/foremen`, {
        method: "POST",
        body: JSON.stringify({ userId: addFmUserId }),
      });
      setMsg("Бригадирът е добавен към обекта.");
      await loadForemen(projectId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Грешка");
    }
  }

  async function removeForeman(projectId: string, userId: string) {
    if (!confirm("Премахване на бригадира от този обект?")) return;
    setError(null);
    try {
      await apiJson(`/api/projects/${projectId}/foremen/${userId}`, {
        method: "DELETE",
      });
      await loadForemen(projectId);
      setMsg("Бригадирът е премахнат от обекта.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Грешка");
    }
  }

  if (!user) {
    return <p className="text-slate-500">Зареждане…</p>;
  }

  const boss = user.role === "BOSS";
  const assignableForemen = allForemen.filter(
    (f) => !assignedFm.some((a) => a.userId === f.id)
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          {boss ? "Обекти" : "Моите обекти"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Преглед за полето: локация, договор и аванс, екипи на обекта
          {boss ? " и постъпили плащания" : ""}.
        </p>
      </div>

      {boss ? (
        <form onSubmit={createProject} className={panel}>
          <h2 className="text-sm font-semibold text-slate-900">Нов обект</h2>
          <p className="mt-1 text-xs text-slate-600">
            Добавете строителен обект с локация и договорна стойност.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold text-slate-700">
                Наименование
              </span>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-3 text-base shadow-sm sm:py-2.5 sm:text-sm"
                required
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold text-slate-700">
                Локация
              </span>
              <input
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-3 text-base shadow-sm sm:py-2.5 sm:text-sm"
                required
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">
                Договорна стойност (лв.)
              </span>
              <input
                value={newTotal}
                onChange={(e) => setNewTotal(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-3 text-base shadow-sm tabular-nums sm:py-2.5 sm:text-sm"
                required
                inputMode="decimal"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Статус</span>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-3 text-base shadow-sm sm:py-2.5 sm:text-sm"
              >
                {PROJECT_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 sm:col-span-2">
              <input
                type="checkbox"
                checked={newAdvance}
                onChange={(e) => setNewAdvance(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              <span className="text-sm font-medium">Има авансово плащане</span>
            </label>
            {newAdvance ? (
              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold text-slate-700">
                  Сума аванс (лв.)
                </span>
                <input
                  value={newAdvanceAmt}
                  onChange={(e) => setNewAdvanceAmt(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-3 text-base shadow-sm tabular-nums sm:py-2.5 sm:text-sm"
                  inputMode="decimal"
                />
              </label>
            ) : null}
          </div>
          <button
            type="submit"
            disabled={pending}
            className="mt-5 min-h-[48px] w-full rounded-lg bg-slate-900 py-3 text-base font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50 sm:text-sm"
          >
            {pending ? "Запис…" : "Добави обект"}
          </button>
        </form>
      ) : null}

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

      <ul className="space-y-4">
        {projects.map((p) => (
          <li
            key={p.id}
            className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5"
          >
            {editId === p.id && boss ? (
              <div className="space-y-3">
                <input
                  value={eName}
                  onChange={(e) => setEName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-3 text-base sm:py-2 sm:text-sm"
                  placeholder="Име"
                />
                <input
                  value={eLoc}
                  onChange={(e) => setELoc(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-3 text-base sm:py-2 sm:text-sm"
                  placeholder="Локация"
                />
                <input
                  value={eTotal}
                  onChange={(e) => setETotal(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-3 text-base tabular-nums sm:py-2 sm:text-sm"
                  placeholder="Договорна стойност"
                />
                <select
                  value={eStatus}
                  onChange={(e) => setEStatus(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-3 text-base sm:py-2 sm:text-sm"
                >
                  {PROJECT_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={eAdvance}
                    onChange={(e) => setEAdvance(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Аванс</span>
                </label>
                {eAdvance ? (
                  <input
                    value={eAdvanceAmt}
                    onChange={(e) => setEAdvanceAmt(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-3 text-base sm:py-2 sm:text-sm"
                    placeholder="Сума аванс"
                  />
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={btnSecondary}
                    onClick={() => void saveEdit(p.id)}
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
              <>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold leading-tight text-slate-900">
                        {p.name}
                      </h2>
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                        {projectStatusBg(p.status)}
                      </span>
                    </div>
                    <p className="text-base leading-snug text-slate-800">
                      <span className="font-medium text-slate-500">Локация: </span>
                      {p.location}
                    </p>
                    <div className="rounded-xl border border-slate-100 bg-slate-50/90 p-3 sm:p-4">
                      <dl className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <dt className="text-xs font-semibold text-slate-500">
                            Договорна стойност
                          </dt>
                          <dd className="mt-0.5 tabular-nums text-base font-semibold text-slate-900">
                            {formatLv(p.totalPrice)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold text-slate-500">
                            Аванс
                          </dt>
                          <dd className="mt-0.5 text-base">
                            {p.advancePayment ? (
                              <span className="font-semibold text-emerald-800 tabular-nums">
                                {p.advanceAmount != null &&
                                String(p.advanceAmount) !== ""
                                  ? formatLv(p.advanceAmount)
                                  : "Да — без посочена сума"}
                              </span>
                            ) : (
                              <span className="text-slate-600">Няма аванс</span>
                            )}
                          </dd>
                        </div>
                        {boss ? (
                          <div className="sm:col-span-2">
                            <dt className="text-xs font-semibold text-slate-500">
                              Постъпили плащания (сумарно)
                            </dt>
                            <dd className="mt-0.5 tabular-nums text-base font-semibold text-blue-900">
                              {formatLv(p.paymentsReceivedTotal ?? 0)}
                            </dd>
                          </div>
                        ) : null}
                      </dl>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Екипи на обекта
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(p.groups ?? []).length === 0 ? (
                          <p className="text-sm leading-relaxed text-slate-500">
                            Няма записани екипи — добавете от раздел „Екип“.
                          </p>
                        ) : (
                          (p.groups ?? []).map((g) => (
                            <span
                              key={g.id}
                              className="inline-flex max-w-full items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm"
                            >
                              <span className="truncate">{g.name}</span>
                              <span className="ml-1.5 shrink-0 tabular-nums text-slate-500">
                                · {g.workerCount}{" "}
                                {g.workerCount === 1 ? "човек" : "души"}
                              </span>
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                  {boss ? (
                    <div className="grid grid-cols-1 gap-2 sm:w-40 sm:shrink-0">
                      <button
                        type="button"
                        className={btnSecondary}
                        onClick={() => startEdit(p)}
                      >
                        Редактирай
                      </button>
                      <button
                        type="button"
                        className={btnSecondary}
                        onClick={() =>
                          setFmOpenFor((x) => (x === p.id ? null : p.id))
                        }
                      >
                        {fmOpenFor === p.id ? "Скрий бригадири" : "Бригадири"}
                      </button>
                      <button
                        type="button"
                        className={btnDanger}
                        onClick={() => void deleteProject(p.id)}
                      >
                        Изтрий обект
                      </button>
                    </div>
                  ) : null}
                </div>

                {boss && fmOpenFor === p.id ? (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <p className="text-xs font-semibold text-slate-700">
                      Бригадири на обекта
                    </p>
                    <ul className="mt-2 space-y-2">
                      {assignedFm.map((a) => (
                        <li
                          key={a.userId}
                          className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"
                        >
                          <span>
                            {a.name ?? "—"}{" "}
                            <span className="text-slate-500">
                              ({a.email ?? a.userId})
                            </span>
                          </span>
                          <button
                            type="button"
                            className={btnDanger}
                            onClick={() =>
                              void removeForeman(p.id, a.userId)
                            }
                          >
                            Премахни
                          </button>
                        </li>
                      ))}
                    </ul>
                    {assignableForemen.length > 0 ? (
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <select
                          value={addFmUserId}
                          onChange={(e) => setAddFmUserId(e.target.value)}
                          className="min-h-[48px] flex-1 rounded-lg border border-slate-200 px-3 py-3 text-base sm:min-h-0 sm:py-2 sm:text-sm"
                        >
                          <option value="">Добави бригадир…</option>
                          {assignableForemen.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name} ({f.email})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className={btnSecondary}
                          onClick={() => void assignForeman(p.id)}
                          disabled={!addFmUserId}
                        >
                          Добави
                        </button>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-slate-500">
                        Няма свободни бригадири — създайте от раздел „Бригадири“.
                      </p>
                    )}
                  </div>
                ) : null}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

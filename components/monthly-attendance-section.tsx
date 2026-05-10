"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AttendanceViewNav } from "@/components/attendance-view-nav";
import { WorkerRole } from "@/lib/enums";
import { formatEur } from "@/lib/format-currency";
import type { AuthUser } from "@/lib/types";
import { apiJson } from "@/lib/client-api";

type ProjectMini = { id: string; name: string };
type WorkerRow = { id: string; name: string; role: string; nadnik?: number | null };
type AttendanceRow = {
  workerId: string;
  date: string;
  present: boolean;
  hours: string | number | null;
};

type CalCell =
  | { kind: "pad" }
  | {
      kind: "day";
      day: number;
      iso: string;
      weekend: boolean;
      dowMon: number;
    };

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

const WD_SHORT_MON = ["пн", "вт", "ср", "чт", "пт", "сб", "нд"];

function currentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function shiftYearMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function monthRange(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return {
    year: y,
    month: m,
    from: `${y}-${pad2(m)}-01`,
    to: `${y}-${pad2(m)}-${pad2(last)}`,
  };
}

function buildCalCells(year: number, month: number): CalCell[] {
  const last = new Date(year, month, 0).getDate();
  const firstDow = new Date(year, month - 1, 1).getDay();
  const startPad = (firstDow + 6) % 7;
  const cells: CalCell[] = [];
  for (let i = 0; i < startPad; i++) cells.push({ kind: "pad" });
  for (let d = 1; d <= last; d++) {
    const wd = new Date(year, month - 1, d).getDay();
    const weekend = wd === 0 || wd === 6;
    cells.push({
      kind: "day",
      day: d,
      iso: `${year}-${pad2(month)}-${pad2(d)}`,
      weekend,
      dowMon: (wd + 6) % 7,
    });
  }
  while (cells.length % 7 !== 0) cells.push({ kind: "pad" });
  return cells;
}

function roleLabel(role: string): string {
  return role === WorkerRole.FOREMAN ? "Бригадир" : "Работник";
}

function dayCellContent(
  rec: AttendanceRow | undefined,
  compact?: boolean
): { title: string; inner: ReactNode } {
  const markCls = compact
    ? "text-xs font-semibold leading-none"
    : "text-sm font-semibold leading-none";
  if (!rec) {
    return {
      title: "Няма запис",
      inner: <span className="text-slate-300">·</span>,
    };
  }
  if (rec.present) {
    const h =
      rec.hours != null && String(rec.hours) !== "" ? String(rec.hours) : "";
    return {
      title: h ? `Присъствие, ${h} ч` : "Присъствие",
      inner: (
        <span className={`${markCls} text-emerald-600`}>✓</span>
      ),
    };
  }
  return {
    title: "Отсъствие",
    inner: (
      <span className={`${markCls} text-rose-500`}>—</span>
    ),
  };
}

function MonthCalCell({
  workerId,
  c,
  idx,
  cellMap,
}: {
  workerId: string;
  c: CalCell;
  idx: number;
  cellMap: Map<string, AttendanceRow>;
}) {
  const weekStart = idx % 7 === 0;
  const borderWeek =
    weekStart && idx > 0 ? "border-l-2 border-l-slate-300" : "";
  if (c.kind === "pad") {
    return (
      <div
        className={`min-h-[3.4rem] rounded-md bg-slate-200/25 ${borderWeek}`}
      />
    );
  }
  const rec = cellMap.get(`${workerId}|${c.iso}`);
  const { title, inner } = dayCellContent(rec, true);
  return (
    <div
      title={title}
      className={`flex min-h-[3.4rem] flex-col rounded-md border border-slate-200/80 bg-white/95 text-center shadow-sm ${borderWeek} ${
        c.weekend
          ? "border-amber-200/70 bg-amber-50/60"
          : ""
      } ${
        rec?.present === false
          ? "border-rose-200/80 bg-rose-50/50"
          : rec?.present
            ? "border-emerald-200/70 bg-emerald-50/40"
            : ""
      }`}
    >
      <div className="flex shrink-0 flex-col items-center gap-0.5 pt-1">
        <span className="text-[8px] font-medium uppercase text-slate-400">
          {WD_SHORT_MON[c.dowMon]}
        </span>
        <span
          className={`flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums ${
            c.weekend
              ? "bg-amber-100 text-amber-900"
              : "bg-slate-100 text-slate-800"
          }`}
        >
          {c.day}
        </span>
      </div>
      <div className="flex flex-1 items-center justify-center pb-1 pt-0.5">
        {inner}
      </div>
    </div>
  );
}

function PaidSalaryBadge() {
  return (
    <span
      className="mt-1 inline-flex w-fit items-center rounded border border-emerald-500/80 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-900 shadow-sm"
      title="Заплатата за този месец е отбелязана като платена (Финанси → Разходи)"
    >
      Платено
    </span>
  );
}

export function MonthlyAttendanceSection() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [projects, setProjects] = useState<ProjectMini[]>([]);
  const [projectId, setProjectId] = useState("");
  const [ym, setYm] = useState(currentYearMonth);
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [entries, setEntries] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [salaryPaidIds, setSalaryPaidIds] = useState<Set<string>>(
    () => new Set()
  );

  const { year, month, from, to } = useMemo(() => monthRange(ym), [ym]);
  const calCells = useMemo(
    () => buildCalCells(year, month),
    [year, month]
  );

  const monthTitle = useMemo(
    () =>
      new Date(year, month - 1, 1).toLocaleDateString("bg-BG", {
        month: "long",
        year: "numeric",
      }),
    [year, month]
  );

  useEffect(() => {
    apiJson<AuthUser>("/api/auth/me").then(setUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void apiJson<ProjectMini[]>("/api/projects").then((list) => {
      if (cancelled) return;
      setProjects(list);
      setProjectId((prev) => prev || list[0]?.id || "");
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const loadMonth = useCallback(async () => {
    if (!projectId || !user) return;
    setLoading(true);
    setErr(null);
    try {
      const [wList, aList, paidRes] = await Promise.all([
        apiJson<WorkerRow[]>(
          `/api/workers?projectId=${encodeURIComponent(projectId)}`
        ),
        apiJson<AttendanceRow[]>(
          `/api/attendance?projectId=${encodeURIComponent(projectId)}&from=${from}&to=${to}`
        ),
        apiJson<{ paidWorkerIds: string[] }>(
          `/api/finance/salary-payout-status?projectId=${encodeURIComponent(projectId)}&year=${year}&month=${month}`
        ).catch(() => ({ paidWorkerIds: [] as string[] })),
      ]);
      setWorkers(wList);
      setEntries(aList);
      setSalaryPaidIds(new Set(paidRes.paidWorkerIds));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Грешка при зареждане");
      setSalaryPaidIds(new Set());
    } finally {
      setLoading(false);
    }
  }, [projectId, user, from, to, year, month]);

  useEffect(() => {
    void loadMonth();
  }, [loadMonth]);

  const cellMap = useMemo(() => {
    const m = new Map<string, AttendanceRow>();
    for (const a of entries) {
      m.set(`${a.workerId}|${a.date}`, a);
    }
    return m;
  }, [entries]);

  const sortedWorkers = useMemo(() => {
    return [...workers].sort((a, b) => {
      const ra = a.role === WorkerRole.FOREMAN ? 0 : 1;
      const rb = b.role === WorkerRole.FOREMAN ? 0 : 1;
      if (ra !== rb) return ra - rb;
      return a.name.localeCompare(b.name, "bg");
    });
  }, [workers]);

  const presentDaysByWorker = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of workers) {
      m.set(w.id, 0);
    }
    for (const a of entries) {
      if (!a.present) continue;
      m.set(a.workerId, (m.get(a.workerId) ?? 0) + 1);
    }
    return m;
  }, [workers, entries]);

  const stats = useMemo(() => {
    let presentDays = 0;
    let absentDays = 0;
    for (const a of entries) {
      if (a.present) presentDays += 1;
      else absentDays += 1;
    }
    return { presentDays, absentDays, recorded: entries.length };
  }, [entries]);

  if (!user) {
    return (
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 text-sm text-slate-500 shadow-sm">
        Зареждане на присъствие…
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-4 sm:px-5">
        <AttendanceViewNav />
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
              Присъствие — месечен календар
            </h1>
            <p className="mt-0.5 text-xs text-slate-600">
              Седмици от понеделник; на телефон календарът е по редове за всеки
              човек. Заплатата е надник (EUR) × брой записани присъствия за месеца
              (задайте надник от страницата „Екип“). Тук е само преглед — за
              корекция на отметка за ден отидете на{" "}
              <Link
                href="/dashboard/attendance"
                className="font-semibold text-blue-700 underline"
              >
                График по ден
              </Link>
              , изберете датата и запазете. Отметката „Платено“ показва, че
              заплатата за месеца е записана през Финанси → Разходи.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setYm((y) => shiftYearMonth(y, -1))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              aria-label="Предишен месец"
            >
              ←
            </button>
            <span className="min-w-[9rem] text-center text-sm font-semibold capitalize text-slate-800">
              {monthTitle}
            </span>
            <button
              type="button"
              onClick={() => setYm((y) => shiftYearMonth(y, 1))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              aria-label="Следващ месец"
            >
              →
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 sm:max-w-xs">
            Обект
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm"
            >
              {projects.length === 0 ? (
                <option value="">— Няма обекти —</option>
              ) : (
                projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))
              )}
            </select>
          </label>
          <div className="flex flex-wrap gap-3 text-xs text-slate-600">
            <span>
              <span className="font-semibold text-emerald-700">
                {stats.presentDays}
              </span>{" "}
              присъствия
            </span>
            <span>
              <span className="font-semibold text-rose-700">
                {stats.absentDays}
              </span>{" "}
              отсъствия
            </span>
            <span className="text-slate-400">
              {stats.recorded} записа
            </span>
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4">
        {err ? (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {err}
          </p>
        ) : null}

        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">
            Зареждане на календара…
          </p>
        ) : sortedWorkers.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            Няма хора в екипа за този обект. Добавете групи и работници от{" "}
            <Link
              href="/dashboard/workers"
              className="font-semibold text-blue-700 underline"
            >
              Екип
            </Link>
            .
          </p>
        ) : (
          <>
            <div className="md:hidden space-y-4">
              {sortedWorkers.map((w) => {
                const days = presentDaysByWorker.get(w.id) ?? 0;
                const rate = w.nadnik;
                const pay =
                  rate != null && Number.isFinite(rate)
                    ? formatEur(rate * days)
                    : "—";
                const rateLabel =
                  rate != null && Number.isFinite(rate)
                    ? formatEur(rate)
                    : "—";
                return (
                  <article
                    key={w.id}
                    className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-3 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/80 pb-3">
                      <div className="min-w-0">
                        <h2 className="font-semibold text-slate-900">
                          {w.name}
                        </h2>
                        <span
                          className={`mt-1 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                            w.role === WorkerRole.FOREMAN
                              ? "bg-amber-100 text-amber-900"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {roleLabel(w.role)}
                        </span>
                        {salaryPaidIds.has(w.id) ? <PaidSalaryBadge /> : null}
                      </div>
                      <dl className="shrink-0 space-y-0.5 text-right text-xs text-slate-600">
                        <div>
                          <dt className="inline text-slate-500">
                            Работни дни:{" "}
                          </dt>
                          <dd className="inline font-semibold tabular-nums text-slate-900">
                            {days}
                          </dd>
                        </div>
                        <div>
                          <dt className="inline text-slate-500">Надник: </dt>
                          <dd className="inline font-medium text-slate-800">
                            {rateLabel}
                          </dd>
                        </div>
                        <div className="pt-0.5 text-sm font-semibold text-slate-900">
                          Заплата: {pay}
                        </div>
                      </dl>
                    </div>
                    <div className="mt-3 grid w-full grid-cols-7 gap-0.5">
                      {calCells.map((c, idx) => (
                        <MonthCalCell
                          key={
                            c.kind === "pad"
                              ? `pad-${w.id}-${idx}`
                              : `${w.id}-${c.iso}`
                          }
                          workerId={w.id}
                          c={c}
                          idx={idx}
                          cellMap={cellMap}
                        />
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto rounded-xl border border-slate-200/80 bg-slate-50/40 md:block">
              <table className="min-w-max w-full border-separate border-spacing-px text-xs">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="sticky left-0 z-30 min-w-[10.5rem] rounded-l-lg border border-slate-200/90 bg-slate-100 px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-600"
                    >
                      Хора / заплата
                    </th>
                    {calCells.map((c, idx) => {
                      const weekStart = idx % 7 === 0;
                      const borderWeek =
                        weekStart && idx > 0
                          ? "border-l-2 border-l-slate-300"
                          : "";
                      if (c.kind === "pad") {
                        return (
                          <th
                            key={`pad-h-${idx}`}
                            className={`w-10 min-w-[2.35rem] border border-slate-200/60 bg-slate-200/25 ${borderWeek}`}
                          />
                        );
                      }
                      return (
                        <th
                          key={c.iso}
                          scope="col"
                          className={`w-10 min-w-[2.35rem] border px-0.5 py-1.5 text-center ${
                            c.weekend
                              ? "border-amber-200/80 bg-amber-50/90"
                              : "border-slate-200/80 bg-white"
                          } ${borderWeek}`}
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-[9px] font-medium uppercase text-slate-400">
                              {WD_SHORT_MON[c.dowMon]}
                            </span>
                            <span
                              className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold tabular-nums ${
                                c.weekend
                                  ? "bg-amber-100 text-amber-900"
                                  : "bg-slate-100 text-slate-800"
                              }`}
                            >
                              {c.day}
                            </span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {sortedWorkers.map((w) => {
                    const days = presentDaysByWorker.get(w.id) ?? 0;
                    const rate = w.nadnik;
                    const pay =
                      rate != null && Number.isFinite(rate)
                        ? formatEur(rate * days)
                        : "—";
                    const rateLabel =
                      rate != null && Number.isFinite(rate)
                        ? formatEur(rate)
                        : "—";
                    return (
                      <tr key={w.id}>
                        <th
                          scope="row"
                          className="sticky left-0 z-20 border border-slate-200/90 bg-white px-2 py-2 text-left align-top shadow-[4px_0_12px_-4px_rgba(15,23,42,0.12)]"
                        >
                          <span className="block max-w-[10rem] truncate font-medium text-slate-900 sm:max-w-[13rem]">
                            {w.name}
                          </span>
                          <span
                            className={`mt-1 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                              w.role === WorkerRole.FOREMAN
                                ? "bg-amber-100 text-amber-900"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {roleLabel(w.role)}
                          </span>
                          {salaryPaidIds.has(w.id) ? <PaidSalaryBadge /> : null}
                          <div className="mt-2 space-y-0.5 border-t border-slate-100 pt-2 text-[10px] leading-snug text-slate-600">
                            <p>
                              <span className="text-slate-500">Дни: </span>
                              <span className="font-semibold tabular-nums text-slate-800">
                                {days}
                              </span>
                            </p>
                            <p>
                              <span className="text-slate-500">Надник: </span>
                              <span className="font-medium text-slate-800">
                                {rateLabel}
                              </span>
                            </p>
                            <p className="font-semibold text-slate-900">
                              Заплата: {pay}
                            </p>
                          </div>
                        </th>
                        {calCells.map((c, idx) => {
                          const weekStart = idx % 7 === 0;
                          const borderWeek =
                            weekStart && idx > 0
                              ? "border-l-2 border-l-slate-300"
                              : "";
                          if (c.kind === "pad") {
                            return (
                              <td
                                key={`pad-${w.id}-${idx}`}
                                className={`border border-slate-200/50 bg-slate-200/20 ${borderWeek}`}
                              />
                            );
                          }
                          const rec = cellMap.get(`${w.id}|${c.iso}`);
                          const { title, inner } = dayCellContent(rec);
                          return (
                            <td
                              key={`${w.id}-${c.iso}`}
                              title={title}
                              className={`border p-0.5 align-middle ${borderWeek} ${
                                c.weekend
                                  ? "border-amber-200/70 bg-amber-50/50"
                                  : "border-slate-200/70 bg-white"
                              }`}
                            >
                              <div
                                className={`mx-auto flex h-10 w-9 flex-col items-center justify-center rounded-lg border border-slate-200/90 bg-white/95 shadow-sm ${
                                  rec?.present === false
                                    ? "border-rose-200/80 bg-rose-50/40"
                                    : rec?.present
                                      ? "border-emerald-200/80 bg-emerald-50/30"
                                      : ""
                                }`}
                              >
                                {inner}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="font-semibold text-emerald-600">✓</span>
            Присъствие
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="font-semibold text-rose-500">—</span>
            Отсъствие
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="text-slate-300">·</span>
            Няма запис
          </span>
          <span className="text-slate-400">
            Седмицата започва от понеделник.
          </span>
        </div>
      </div>
    </section>
  );
}

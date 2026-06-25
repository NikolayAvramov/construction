"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AttendanceViewNav } from "@/components/attendance-view-nav";
import type { AuthUser } from "@/lib/types";
import { apiJson } from "@/lib/client-api";

type ProjectMini = { id: string; name: string };
type WorkerRow = { id: string; name: string };
type AttendanceRow = {
  workerId: string;
  date: string;
  present: boolean;
  hours: string | number | null;
};

type Cell = { present: boolean; hours: string };

function addDays(isoDate: string, delta: number): string {
  const d = new Date(isoDate + "T12:00:00");
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

const panel =
  "rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-6";

export default function AttendanceSchedulePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [projects, setProjects] = useState<ProjectMini[]>([]);
  const [projectId, setProjectId] = useState("");
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [date, setDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [grid, setGrid] = useState<Record<string, Cell>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const loadDay = useCallback(async () => {
    if (!projectId || !user) return;
    setLoading(true);
    setMsg(null);
    try {
      const [wList, aList] = await Promise.all([
        apiJson<WorkerRow[]>(
          `/api/workers?projectId=${encodeURIComponent(projectId)}`
        ),
        apiJson<AttendanceRow[]>(
          `/api/attendance?projectId=${encodeURIComponent(projectId)}&from=${date}&to=${date}`
        ),
      ]);
      setWorkers(wList);
      const next: Record<string, Cell> = {};
      for (const w of wList) {
        next[w.id] = { present: true, hours: "8" };
      }
      for (const a of aList) {
        if (next[a.workerId]) {
          next[a.workerId] = {
            present: a.present,
            hours:
              a.hours != null && String(a.hours) !== ""
                ? String(a.hours)
                : "8",
          };
        }
      }
      setGrid(next);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Грешка при зареждане");
    } finally {
      setLoading(false);
    }
  }, [projectId, date, user]);

  useEffect(() => {
    apiJson<AuthUser>("/api/auth/me").then(setUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    apiJson<ProjectMini[]>("/api/projects").then((list) => {
      setProjects(list);
      if (list[0] && !projectId) setProjectId(list[0].id);
    });
  }, [user]);

  useEffect(() => {
    if (!user || !projectId) return;
    void loadDay();
  }, [user, projectId, date, loadDay]);

  function setCell(workerId: string, patch: Partial<Cell>) {
    setGrid((prev) => ({
      ...prev,
      [workerId]: {
        present: patch.present ?? prev[workerId]?.present ?? true,
        hours: patch.hours ?? prev[workerId]?.hours ?? "8",
      },
    }));
  }

  async function saveAll() {
    if (!projectId || workers.length === 0) return;
    setSaving(true);
    setMsg(null);
    try {
      await Promise.all(
        workers.map((w) => {
          const cell = grid[w.id] ?? { present: true, hours: "8" };
          const hrs =
            cell.present && cell.hours.trim() !== ""
              ? Number(cell.hours.replace(",", "."))
              : null;
          return apiJson("/api/attendance", {
            method: "POST",
            body: JSON.stringify({
              workerId: w.id,
              date,
              present: cell.present,
              hours: cell.present ? hrs : null,
            }),
          });
        })
      );
      setMsg("Присъствието за избрания ден е запазено.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Грешка при запис");
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return <p className="text-slate-500">Зареждане…</p>;
  }

  const label = new Date(date + "T12:00:00").toLocaleDateString("bg-BG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <div>
        <AttendanceViewNav />
        <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900">
          График — присъствие по ден
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          За всеки работник отбележете дали е на работа и часовете
          за избрания ден. Натиснете „Запази деня“, за да запишете всички редове
          наведнъж. Месечен изглед като календар —{" "}
          <Link
            href="/dashboard/attendance/month"
            className="font-semibold text-blue-700 underline"
          >
            тук
          </Link>
          .
        </p>
      </div>

      <div className={panel}>
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="block min-w-[200px] flex-1">
            <span className="text-xs font-semibold text-slate-700">Обект</span>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm shadow-sm"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => setDate((d) => addDays(d, -1))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              aria-label="Предишен ден"
            >
              ←
            </button>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm shadow-sm"
            />
            <button
              type="button"
              onClick={() => setDate((d) => addDays(d, 1))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              aria-label="Следващ ден"
            >
              →
            </button>
          </div>
        </div>
        <p className="mt-3 text-center text-sm font-medium capitalize text-slate-700">
          {label}
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Зареждане на екипа…</p>
      ) : null}

      {msg ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {msg}
        </p>
      ) : null}

      {projects.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
          Няма обекти. Добавете обект от раздел „Обекти“, после групи и
          работници от „Екип“.
        </p>
      ) : workers.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
          За този обект няма работници. Създайте група и добавете хора в раздел
          „Екип“.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200/90 bg-white shadow-sm">
          <table className="w-full min-w-[320px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-4 py-3 font-semibold text-slate-800">
                  Работник
                </th>
                <th className="px-4 py-3 font-semibold text-slate-800">
                  На работа
                </th>
                <th className="px-4 py-3 font-semibold text-slate-800">
                  Часове
                </th>
              </tr>
            </thead>
            <tbody>
              {workers.map((w) => {
                const cell = grid[w.id] ?? { present: true, hours: "8" };
                return (
                  <tr
                    key={w.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {w.name}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={cell.present}
                        onChange={(e) =>
                          setCell(w.id, { present: e.target.checked })
                        }
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        disabled={!cell.present}
                        value={cell.hours}
                        onChange={(e) =>
                          setCell(w.id, { hours: e.target.value })
                        }
                        className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-sm tabular-nums shadow-sm disabled:bg-slate-100"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {workers.length > 0 ? (
        <button
          type="button"
          onClick={() => void saveAll()}
          disabled={saving || loading}
          className="w-full rounded-lg bg-slate-900 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? "Запис…" : "Запази деня"}
        </button>
      ) : null}
    </div>
  );
}

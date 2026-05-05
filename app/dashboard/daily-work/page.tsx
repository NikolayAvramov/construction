"use client";

import { useCallback, useEffect, useState } from "react";
import type { AuthUser } from "@/lib/types";
import { apiJson } from "@/lib/client-api";

type ProjectMini = { id: string; name: string };
type DailyEntry = {
  id: string;
  projectId: string;
  date: string;
  tasksPlanned: string;
  tasksCompleted: string;
  notes: string;
};

const btnSecondary =
  "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50";
const btnDanger =
  "rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100";

export default function DailyWorkPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [projects, setProjects] = useState<ProjectMini[]>([]);
  const [projectId, setProjectId] = useState("");
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [date, setDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [planned, setPlanned] = useState("");
  const [done, setDone] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const [editEntryId, setEditEntryId] = useState<string | null>(null);
  const [epPlan, setEpPlan] = useState("");
  const [epDone, setEpDone] = useState("");
  const [epNotes, setEpNotes] = useState("");

  const loadEntries = useCallback(async () => {
    if (!projectId) return;
    const q = `/api/daily-work?projectId=${encodeURIComponent(projectId)}`;
    const list = await apiJson<DailyEntry[]>(q);
    setEntries(list);
  }, [projectId]);

  useEffect(() => {
    apiJson<AuthUser>("/api/auth/me").then(setUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    apiJson<ProjectMini[]>("/api/projects").then((list) => {
      setProjects(list);
      if (list[0]) setProjectId(list[0].id);
    });
  }, [user]);

  useEffect(() => {
    if (!projectId) return;
    void loadEntries();
  }, [projectId, loadEntries]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      await apiJson("/api/daily-work", {
        method: "POST",
        body: JSON.stringify({
          projectId,
          date,
          tasksPlanned: planned,
          tasksCompleted: done,
          notes,
        }),
      });
      setMessage("Дневникът е запазен.");
      await loadEntries();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Грешка");
    }
  }

  async function saveEntry(id: string) {
    setMessage(null);
    try {
      await apiJson(`/api/daily-work/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          tasksPlanned: epPlan,
          tasksCompleted: epDone,
          notes: epNotes,
        }),
      });
      setEditEntryId(null);
      setMessage("Записът е обновен.");
      await loadEntries();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Грешка");
    }
  }

  async function deleteEntry(id: string) {
    if (!confirm("Изтриване на този дневник?")) return;
    setMessage(null);
    try {
      await apiJson(`/api/daily-work/${id}`, { method: "DELETE" });
      setMessage("Записът е изтрит.");
      await loadEntries();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Грешка");
    }
  }

  if (!user) {
    return <p className="text-slate-500">Зареждане…</p>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold tracking-tight text-slate-900">
        Дневен дневник
      </h1>
      <p className="text-sm text-slate-600">
        Добавяйте и редактирайте записи по обект. По-долу са всички запазени
        дневници за избрания обект.
      </p>
      <form
        onSubmit={submit}
        className="space-y-4 rounded-xl border border-slate-200/90 bg-white p-6 shadow-sm"
      >
        <label className="block">
          <span className="text-xs font-semibold text-slate-700">Обект</span>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-3 text-base shadow-sm"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-700">Дата</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-3 text-base shadow-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-700">
            Планирано за деня
          </span>
          <textarea
            value={planned}
            onChange={(e) => setPlanned(e.target.value)}
            rows={3}
            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-3 text-base shadow-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-700">
            Изпълнено днес
          </span>
          <textarea
            value={done}
            onChange={(e) => setDone(e.target.value)}
            rows={3}
            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-3 text-base shadow-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-700">Бележки</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-3 text-base shadow-sm"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-lg bg-blue-700 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-800"
        >
          Запази дневник
        </button>
        {message ? (
          <p className="text-center text-sm text-slate-600">{message}</p>
        ) : null}
      </form>

      <div>
        <h2 className="text-sm font-semibold text-slate-800">
          Записи за обекта
        </h2>
        <ul className="mt-3 space-y-3">
          {entries.length === 0 ? (
            <li className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
              Няма записи.
            </li>
          ) : (
            entries.map((en) => (
              <li
                key={en.id}
                className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm"
              >
                {editEntryId === en.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={epPlan}
                      onChange={(e) => setEpPlan(e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                      placeholder="Планирано"
                    />
                    <textarea
                      value={epDone}
                      onChange={(e) => setEpDone(e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                      placeholder="Изпълнено"
                    />
                    <textarea
                      value={epNotes}
                      onChange={(e) => setEpNotes(e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                      placeholder="Бележки"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className={btnSecondary}
                        onClick={() => void saveEntry(en.id)}
                      >
                        Запази
                      </button>
                      <button
                        type="button"
                        className={btnSecondary}
                        onClick={() => setEditEntryId(null)}
                      >
                        Отказ
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        {new Date(en.date).toLocaleDateString("bg-BG")}
                      </p>
                      <p className="mt-1 text-sm text-slate-800">
                        <span className="font-medium">План:</span>{" "}
                        {en.tasksPlanned || "—"}
                      </p>
                      <p className="text-sm text-slate-800">
                        <span className="font-medium">Изпълнено:</span>{" "}
                        {en.tasksCompleted || "—"}
                      </p>
                      {en.notes ? (
                        <p className="mt-1 text-sm text-slate-600">{en.notes}</p>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className={btnSecondary}
                        onClick={() => {
                          setEditEntryId(en.id);
                          setEpPlan(en.tasksPlanned ?? "");
                          setEpDone(en.tasksCompleted ?? "");
                          setEpNotes(en.notes ?? "");
                        }}
                      >
                        Редактирай
                      </button>
                      <button
                        type="button"
                        className={btnDanger}
                        onClick={() => void deleteEntry(en.id)}
                      >
                        Изтрий
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

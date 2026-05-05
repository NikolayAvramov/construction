"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthUser } from "@/lib/types";
import { apiJson } from "@/lib/client-api";
import { workerRoleBg, WORKER_ROLE_OPTIONS } from "@/lib/ui-labels";

type ProjectMini = { id: string; name: string };
type WorkerRow = {
  id: string;
  name: string;
  role: string;
  groupId?: string | null;
};
type GroupRow = {
  id: string;
  name: string;
  projectId: string;
  workers?: WorkerRow[];
};

const panel =
  "rounded-xl border border-slate-200/90 bg-white p-6 shadow-sm";

const btnSecondary =
  "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50";
const btnDanger =
  "rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100";

export default function WorkersPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [projects, setProjects] = useState<ProjectMini[]>([]);
  const [projectId, setProjectId] = useState("");
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pendingGroup, setPendingGroup] = useState(false);
  const [pendingWorker, setPendingWorker] = useState(false);

  const [groupName, setGroupName] = useState("");
  const [wName, setWName] = useState("");
  const [wRole, setWRole] = useState("WORKER");
  const [wGroupId, setWGroupId] = useState("");

  const [editGroupId, setEditGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [editWorkerId, setEditWorkerId] = useState<string | null>(null);
  const [ewName, setEwName] = useState("");
  const [ewRole, setEwRole] = useState("WORKER");
  const [ewGroupId, setEwGroupId] = useState("");
  /** Разгънат екип — работниците се виждат само при клик върху реда на екипа */
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);

  const reloadGroups = useCallback(async () => {
    if (!projectId) return;
    const g = await apiJson<GroupRow[]>(
      `/api/workers/groups?projectId=${encodeURIComponent(projectId)}`
    );
    setGroups(g);
    if (g[0]) setWGroupId((prev) => prev || g[0].id);
  }, [projectId]);

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
      if (list[0] && !projectId) setProjectId(list[0].id);
    });
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== "BOSS" || !projectId) return;
    void reloadGroups();
  }, [user, projectId, reloadGroups]);

  useEffect(() => {
    setOpenGroupId(null);
  }, [projectId]);

  const totalWorkers = useMemo(
    () => groups.reduce((n, g) => n + (g.workers?.length ?? 0), 0),
    [groups]
  );

  async function addGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    setErr(null);
    setMsg(null);
    setPendingGroup(true);
    try {
      await apiJson("/api/workers/groups", {
        method: "POST",
        body: JSON.stringify({ name: groupName.trim(), projectId }),
      });
      setGroupName("");
      setMsg("Групата е създадена.");
      await reloadGroups();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Грешка");
    } finally {
      setPendingGroup(false);
    }
  }

  async function addWorker(e: React.FormEvent) {
    e.preventDefault();
    if (!wGroupId) {
      setErr("Първо създайте поне една група за този обект.");
      return;
    }
    setErr(null);
    setMsg(null);
    setPendingWorker(true);
    try {
      await apiJson("/api/workers", {
        method: "POST",
        body: JSON.stringify({
          name: wName.trim(),
          role: wRole,
          groupId: wGroupId,
        }),
      });
      setWName("");
      setMsg("Работникът е добавен.");
      await reloadGroups();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Грешка");
    } finally {
      setPendingWorker(false);
    }
  }

  async function saveGroup(gid: string) {
    setErr(null);
    setMsg(null);
    try {
      await apiJson(`/api/workers/groups/${gid}`, {
        method: "PATCH",
        body: JSON.stringify({ name: editGroupName.trim() }),
      });
      setEditGroupId(null);
      setMsg("Групата е обновена.");
      await reloadGroups();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Грешка");
    }
  }

  async function deleteGroup(gid: string) {
    if (!confirm("Изтриване на групата? Работниците остават без група."))
      return;
    setErr(null);
    try {
      await apiJson(`/api/workers/groups/${gid}`, { method: "DELETE" });
      setMsg("Групата е изтрита.");
      await reloadGroups();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Грешка");
    }
  }

  async function saveWorker(wid: string) {
    setErr(null);
    setMsg(null);
    try {
      await apiJson(`/api/workers/${wid}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: ewName.trim(),
          role: ewRole,
          groupId: ewGroupId || null,
        }),
      });
      setEditWorkerId(null);
      setMsg("Работникът е обновен.");
      await reloadGroups();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Грешка");
    }
  }

  async function deleteWorker(wid: string) {
    if (!confirm("Изтриване на работника?")) return;
    setErr(null);
    try {
      await apiJson(`/api/workers/${wid}`, { method: "DELETE" });
      setMsg("Работникът е изтрит.");
      await reloadGroups();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Грешка");
    }
  }

  if (!user || user.role !== "BOSS") {
    return null;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Работници и групи
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Първо виждате само екипите по обект. Натиснете реда на екип, за да се
          покажат работниците вътре. Всички записи могат да се редактират и
          изтриват.
        </p>
      </div>

      <label className="block">
        <span className="text-xs font-semibold text-slate-700">Обект</span>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm"
        >
          {projects.length === 0 ? (
            <option value="">Няма обекти — добавете от „Обекти“</option>
          ) : null}
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

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

      <form onSubmit={addGroup} className={panel}>
        <h2 className="text-sm font-semibold text-slate-900">Нова група</h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Име на група"
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm shadow-sm"
            required
            disabled={!projectId}
          />
          <button
            type="submit"
            disabled={pendingGroup || !projectId}
            className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50"
          >
            {pendingGroup ? "…" : "Добави група"}
          </button>
        </div>
      </form>

      <form onSubmit={addWorker} className={panel}>
        <h2 className="text-sm font-semibold text-slate-900">Нов работник</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold text-slate-700">Име</span>
            <input
              value={wName}
              onChange={(e) => setWName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm shadow-sm"
              required
              disabled={!projectId || groups.length === 0}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Роля</span>
            <select
              value={wRole}
              onChange={(e) => setWRole(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm shadow-sm"
              disabled={!projectId || groups.length === 0}
            >
              {WORKER_ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Група</span>
            <select
              value={wGroupId}
              onChange={(e) => setWGroupId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm shadow-sm"
              disabled={!projectId || groups.length === 0}
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="submit"
          disabled={pendingWorker || !projectId || groups.length === 0}
          className="mt-4 w-full rounded-lg bg-slate-900 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
        >
          {pendingWorker ? "Запис…" : "Добави работник"}
        </button>
      </form>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-800">
          Екипи по обекта
          <span className="ml-2 font-normal text-slate-500">
            ({groups.length} екипа · {totalWorkers}{" "}
            {totalWorkers === 1 ? "човек" : "души"})
          </span>
        </h2>
        {groups.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
            Няма групи за този обект.
          </p>
        ) : (
          groups.map((g) => {
            const wCount = (g.workers ?? []).length;
            const expanded = openGroupId === g.id;
            return (
              <div
                key={g.id}
                className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm"
              >
                {editGroupId === g.id ? (
                  <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
                    <input
                      value={editGroupName}
                      onChange={(e) => setEditGroupName(e.target.value)}
                      className="min-w-[160px] flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    />
                    <button
                      type="button"
                      className={btnSecondary}
                      onClick={() => void saveGroup(g.id)}
                    >
                      Запази
                    </button>
                    <button
                      type="button"
                      className={btnSecondary}
                      onClick={() => setEditGroupId(null)}
                    >
                      Отказ
                    </button>
                  </div>
                ) : (
                  <div className="flex items-stretch gap-0">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50"
                      aria-expanded={expanded}
                      onClick={() =>
                        setOpenGroupId((id) => (id === g.id ? null : g.id))
                      }
                    >
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"
                        aria-hidden
                      >
                        {expanded ? "▼" : "▶"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-slate-900">
                          {g.name}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {wCount === 0
                            ? "Няма работници"
                            : wCount === 1
                              ? "1 работник"
                              : `${wCount} работници`}
                          {expanded ? "" : " · натиснете за списък"}
                        </span>
                      </span>
                    </button>
                    <div className="flex shrink-0 items-center gap-2 border-l border-slate-100 bg-slate-50/40 px-3">
                      <button
                        type="button"
                        className={btnSecondary}
                        onClick={() => {
                          setEditGroupId(g.id);
                          setEditGroupName(g.name);
                          setOpenGroupId(g.id);
                        }}
                      >
                        Редактирай
                      </button>
                      <button
                        type="button"
                        className={btnDanger}
                        onClick={() => void deleteGroup(g.id)}
                      >
                        Изтрий група
                      </button>
                    </div>
                  </div>
                )}
                {expanded && editGroupId !== g.id ? (
                  <ul className="space-y-2 border-t border-slate-100 bg-slate-50/30 px-4 py-3">
                    {wCount === 0 ? (
                      <li className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-500">
                        Няма хора в този екип.
                      </li>
                    ) : (
                      (g.workers ?? []).map((w) => (
                        <li
                          key={w.id}
                          className="rounded-lg border border-slate-100 bg-white px-3 py-2 shadow-sm"
                        >
                          {editWorkerId === w.id ? (
                            <div className="grid gap-2 sm:grid-cols-2">
                              <input
                                value={ewName}
                                onChange={(e) => setEwName(e.target.value)}
                                className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm sm:col-span-2"
                              />
                              <select
                                value={ewRole}
                                onChange={(e) => setEwRole(e.target.value)}
                                className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                              >
                                {WORKER_ROLE_OPTIONS.map((o) => (
                                  <option key={o.value} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={ewGroupId}
                                onChange={(e) => setEwGroupId(e.target.value)}
                                className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                              >
                                {groups.map((gr) => (
                                  <option key={gr.id} value={gr.id}>
                                    {gr.name}
                                  </option>
                                ))}
                              </select>
                              <div className="flex gap-2 sm:col-span-2">
                                <button
                                  type="button"
                                  className={btnSecondary}
                                  onClick={() => void saveWorker(w.id)}
                                >
                                  Запази
                                </button>
                                <button
                                  type="button"
                                  className={btnSecondary}
                                  onClick={() => setEditWorkerId(null)}
                                >
                                  Отказ
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="font-medium text-slate-900">
                                  {w.name}
                                </p>
                                <p className="text-xs text-slate-600">
                                  {workerRoleBg(w.role)}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  className={btnSecondary}
                                  onClick={() => {
                                    setEditWorkerId(w.id);
                                    setEwName(w.name);
                                    setEwRole(w.role);
                                    setEwGroupId(w.groupId ?? g.id);
                                    setOpenGroupId(g.id);
                                  }}
                                >
                                  Редактирай
                                </button>
                                <button
                                  type="button"
                                  className={btnDanger}
                                  onClick={() => void deleteWorker(w.id)}
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
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

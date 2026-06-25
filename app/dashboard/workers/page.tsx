"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthUser } from "@/lib/types";
import { apiJson } from "@/lib/client-api";
import { formatEur } from "@/lib/format-currency";
import {
  badge,
  btnDanger,
  btnGhost,
  btnPrimary,
  btnPrimaryBlue,
  btnSecondary,
  emptyStateBox,
  inputBaseSm,
  labelText,
  listCard,
  panel,
} from "@/lib/ui-classes";
import { AddButton } from "@/components/ui/add-button";
import { FlashMessages } from "@/components/ui/flash-messages";
import { FormSheet } from "@/components/ui/form-sheet";
import { PageHeader } from "@/components/ui/page-header";

type ProjectMini = { id: string; name: string };
type WorkerRow = {
  id: string;
  name: string;
  role: string;
  groupId?: string | null;
  nadnik?: number | null;
};
type GroupRow = {
  id: string;
  name: string;
  projectId: string;
  workers?: WorkerRow[];
};

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
  const [wGroupId, setWGroupId] = useState("");
  const [wNadnik, setWNadnik] = useState("");

  const [editGroupId, setEditGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [editWorkerId, setEditWorkerId] = useState<string | null>(null);
  const [ewName, setEwName] = useState("");
  const [ewGroupId, setEwGroupId] = useState("");
  const [ewNadnik, setEwNadnik] = useState("");
  const [sheetGroup, setSheetGroup] = useState(false);
  const [sheetWorker, setSheetWorker] = useState(false);

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

  const totalWorkers = useMemo(
    () => groups.reduce((n, g) => n + (g.workers?.length ?? 0), 0),
    [groups]
  );

  const selectedProject = projects.find((p) => p.id === projectId);

  function openAddWorker(groupId: string) {
    setWGroupId(groupId);
    setSheetWorker(true);
  }

  function workerInitial(name: string): string {
    const t = name.trim();
    if (!t) return "?";
    const parts = t.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return t.slice(0, 2).toUpperCase();
  }

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
      setSheetGroup(false);
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
      const nadnikPayload =
        wNadnik.trim() === ""
          ? {}
          : (() => {
              const n = Number(wNadnik.replace(",", "."));
              return Number.isFinite(n) && n >= 0 ? { nadnik: n } : {};
            })();
      await apiJson("/api/workers", {
        method: "POST",
        body: JSON.stringify({
          name: wName.trim(),
          groupId: wGroupId,
          ...nadnikPayload,
        }),
      });
      setWName("");
      setWNadnik("");
      setSheetWorker(false);
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
      const patchNadnik =
        ewNadnik.trim() === ""
          ? { nadnik: null }
          : (() => {
              const n = Number(ewNadnik.replace(",", "."));
              return Number.isFinite(n) && n >= 0
                ? { nadnik: n }
                : { nadnik: null };
            })();
      await apiJson(`/api/workers/${wid}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: ewName.trim(),
          groupId: ewGroupId || null,
          ...patchNadnik,
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
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Работници и екипи"
        description="Изберете обект. Всеки екип показва работниците си веднага — добавяйте хора от бутона в картата на екипа или отгоре."
      >
        <AddButton
          onClick={() => setSheetGroup(true)}
          disabled={!projectId}
          variant="secondary"
        >
          Екип
        </AddButton>
        <AddButton
          onClick={() => setSheetWorker(true)}
          disabled={!projectId || groups.length === 0}
        >
          Работник
        </AddButton>
      </PageHeader>

      <div className={`${panel} space-y-4`}>
        <label className="block">
          <span className={labelText}>Обект</span>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className={inputBaseSm}
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
        {projectId ? (
          <div className="flex flex-wrap gap-3 border-t border-[var(--border)] pt-4 text-sm">
            <div className="min-w-[120px] flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Екипи
              </p>
              <p className="mt-0.5 text-lg font-semibold text-[var(--brand)]">
                {groups.length}
              </p>
            </div>
            <div className="min-w-[120px] flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Работници
              </p>
              <p className="mt-0.5 text-lg font-semibold text-[var(--brand)]">
                {totalWorkers}
              </p>
            </div>
            {selectedProject ? (
              <div className="w-full text-xs text-slate-600 sm:w-auto sm:flex-1 sm:text-right">
                Преглед за{" "}
                <span className="font-medium text-slate-800">
                  {selectedProject.name}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <FlashMessages success={msg} error={err} />

      <FormSheet
        open={sheetGroup}
        onClose={() => setSheetGroup(false)}
        title="Нов екип"
        description="Екип в рамките на избрания обект (напр. бетон, довършителни)."
      >
        <form onSubmit={addGroup} className="space-y-4">
          <label className="block">
            <span className={labelText}>Име на екип</span>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="напр. Бетонджии"
              className={inputBaseSm}
              required
              disabled={!projectId}
              autoFocus
            />
          </label>
          <button
            type="submit"
            disabled={pendingGroup || !projectId}
            className={btnPrimaryBlue}
          >
            {pendingGroup ? "Запис…" : "Създай екип"}
          </button>
        </form>
      </FormSheet>

      <FormSheet
        open={sheetWorker}
        onClose={() => setSheetWorker(false)}
        title="Нов работник"
        description="Работник в екипа. Прораб (бригадир) се добавя от раздел „Бригадири“."
      >
        <form onSubmit={addWorker} className="space-y-4">
          <label className="block">
            <span className={labelText}>Име</span>
            <input
              value={wName}
              onChange={(e) => setWName(e.target.value)}
              className={inputBaseSm}
              required
              disabled={!projectId || groups.length === 0}
              autoFocus
            />
          </label>
          <label className="block">
            <span className={labelText}>Екип</span>
            <select
              value={wGroupId}
              onChange={(e) => setWGroupId(e.target.value)}
              className={inputBaseSm}
              disabled={!projectId || groups.length === 0}
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelText}>Надник (EUR / работен ден)</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={wNadnik}
              onChange={(e) => setWNadnik(e.target.value)}
              placeholder="по избор"
              className={inputBaseSm}
              disabled={!projectId || groups.length === 0}
            />
          </label>
          <button
            type="submit"
            disabled={pendingWorker || !projectId || groups.length === 0}
            className={btnPrimary}
          >
            {pendingWorker ? "Запис…" : "Добави работник"}
          </button>
        </form>
      </FormSheet>

      <section className="space-y-4" aria-labelledby="teams-heading">
        <h2
          id="teams-heading"
          className="text-sm font-semibold text-slate-800"
        >
          Екипи на обекта
        </h2>

        {groups.length === 0 ? (
          <div className={emptyStateBox}>
            <p className="text-sm font-medium text-slate-700">
              Все още няма екипи за този обект
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Създайте първи екип (напр. „Бетон“, „Довършителни работи“), след
              което добавете работници.
            </p>
            <button
              type="button"
              disabled={!projectId}
              onClick={() => setSheetGroup(true)}
              className={`${btnPrimaryBlue} mt-5 max-w-xs`}
            >
              Създай първи екип
            </button>
          </div>
        ) : (
          <ul className="space-y-4">
            {groups.map((g) => {
              const workers = g.workers ?? [];
              const wCount = workers.length;
              const editingGroup = editGroupId === g.id;

              return (
                <li
                  key={g.id}
                  className={`overflow-hidden ${listCard} !p-0 ring-1 ring-transparent`}
                >
                  <header className="border-b border-[var(--border)] bg-gradient-to-r from-slate-50/80 to-white px-4 py-4 sm:px-5">
                    {editingGroup ? (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <label className="min-w-0 flex-1">
                          <span className="sr-only">Име на екип</span>
                          <input
                            value={editGroupName}
                            onChange={(e) => setEditGroupName(e.target.value)}
                            className="w-full rounded-xl border border-[var(--border-strong)] bg-white px-3 py-2.5 text-sm font-medium text-slate-900 shadow-[var(--shadow-sm)]"
                            autoFocus
                          />
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className={btnPrimaryBlue}
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
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start gap-3">
                          <div
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)]/10 text-sm font-bold text-[var(--brand)]"
                            aria-hidden
                          >
                            {workerInitial(g.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
                              {g.name}
                            </h3>
                            <p className="mt-0.5 text-sm text-slate-600">
                              {wCount === 0
                                ? "Няма назначени работници"
                                : wCount === 1
                                  ? "1 работник в екипа"
                                  : `${wCount} работника в екипа`}
                            </p>
                          </div>
                          <span
                            className={`${badge} shrink-0 bg-slate-100 text-slate-700`}
                          >
                            {wCount}
                          </span>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--border)]/80 pt-3">
                          <button
                            type="button"
                            className={`${btnPrimary} !w-auto !min-h-[40px] px-4 py-2 text-sm lg:!min-h-[36px]`}
                            onClick={() => openAddWorker(g.id)}
                          >
                            + Работник в екипа
                          </button>
                          <button
                            type="button"
                            className={btnGhost}
                            onClick={() => {
                              setEditGroupId(g.id);
                              setEditGroupName(g.name);
                            }}
                          >
                            Преименувай екип
                          </button>
                          <button
                            type="button"
                            className={`${btnGhost} text-red-700 hover:bg-red-50 hover:text-red-800`}
                            onClick={() => void deleteGroup(g.id)}
                          >
                            Изтрий екип
                          </button>
                        </div>
                      </>
                    )}
                  </header>

                  {!editingGroup ? (
                    <div className="px-4 py-2 sm:px-5">
                      {wCount === 0 ? (
                        <button
                          type="button"
                          onClick={() => openAddWorker(g.id)}
                          className="my-3 flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-300/90 bg-slate-50/60 px-4 py-8 text-center transition hover:border-[var(--accent)]/40 hover:bg-[var(--accent-soft)]/30"
                        >
                          <span className="text-sm font-semibold text-[var(--brand)]">
                            Добавете първия работник
                          </span>
                          <span className="mt-1 text-xs text-slate-500">
                            Ще се запише директно в екип „{g.name}“
                          </span>
                        </button>
                      ) : (
                        <ul className="divide-y divide-[var(--border)]">
                          {workers.map((w) => (
                            <li key={w.id} className="py-1">
                              {editWorkerId === w.id ? (
                                <div className="my-3 rounded-xl border border-[var(--border)] bg-slate-50/80 p-4">
                                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Редакция на работник
                                  </p>
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    <label className="sm:col-span-2">
                                      <span className={labelText}>Име</span>
                                      <input
                                        value={ewName}
                                        onChange={(e) =>
                                          setEwName(e.target.value)
                                        }
                                        className={inputBaseSm}
                                      />
                                    </label>
                                    <label className="sm:col-span-2">
                                      <span className={labelText}>Екип</span>
                                      <select
                                        value={ewGroupId}
                                        onChange={(e) =>
                                          setEwGroupId(e.target.value)
                                        }
                                        className={inputBaseSm}
                                      >
                                        {groups.map((gr) => (
                                          <option key={gr.id} value={gr.id}>
                                            {gr.name}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                    <label className="sm:col-span-2">
                                      <span className={labelText}>
                                        Надник (EUR / ден)
                                      </span>
                                      <input
                                        type="number"
                                        inputMode="decimal"
                                        min={0}
                                        step="0.01"
                                        value={ewNadnik}
                                        onChange={(e) =>
                                          setEwNadnik(e.target.value)
                                        }
                                        placeholder="празно = без ставка"
                                        className={inputBaseSm}
                                      />
                                    </label>
                                    <div className="flex gap-2 sm:col-span-2">
                                      <button
                                        type="button"
                                        className={btnPrimary}
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
                                </div>
                              ) : (
                                <div className="flex flex-wrap items-center justify-between gap-3 py-3">
                                  <div className="flex min-w-0 items-center gap-3">
                                    <div
                                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600"
                                      aria-hidden
                                    >
                                      {workerInitial(w.name)}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-medium text-slate-900">
                                        {w.name}
                                      </p>
                                      <p className="text-xs text-slate-500">
                                        {w.nadnik != null
                                          ? `Надник ${formatEur(w.nadnik)} / ден`
                                          : "Без зададен надник"}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex shrink-0 gap-2">
                                    <button
                                      type="button"
                                      className={btnGhost}
                                      onClick={() => {
                                        setEditWorkerId(w.id);
                                        setEwName(w.name);
                                        setEwGroupId(w.groupId ?? g.id);
                                        setEwNadnik(
                                          w.nadnik != null
                                            ? String(w.nadnik)
                                            : ""
                                        );
                                      }}
                                    >
                                      Редактирай
                                    </button>
                                    <button
                                      type="button"
                                      className={`${btnGhost} text-red-700 hover:bg-red-50`}
                                      onClick={() => void deleteWorker(w.id)}
                                    >
                                      Изтрий
                                    </button>
                                  </div>
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

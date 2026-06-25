"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { AuthUser } from "@/lib/types";
import { apiJson } from "@/lib/client-api";
import {
  btnPrimary,
  btnSecondary,
  inputBase,
  labelText,
  listCard,
  panel,
} from "@/lib/ui-classes";
import { AddButton } from "@/components/ui/add-button";
import { FlashMessages } from "@/components/ui/flash-messages";
import { FormSheet } from "@/components/ui/form-sheet";
import { PageHeader } from "@/components/ui/page-header";

type ProjectMini = { id: string; name: string };
type ForemanRow = {
  id: string;
  name: string;
  email: string;
  projects: ProjectMini[];
};

function ProjectPicker({
  projects,
  selectedIds,
  onChange,
  disabled,
}: {
  projects: ProjectMini[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  if (projects.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300/80 bg-slate-50/80 px-3 py-4 text-sm text-slate-600">
        Няма обекти. Първо добавете обект от раздел „Обекти“, след което го
        назначете на бригадира.
      </p>
    );
  }

  function toggle(id: string) {
    if (disabled) return;
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  }

  return (
    <ul className="max-h-52 space-y-2 overflow-y-auto rounded-xl border border-[var(--border)] bg-slate-50/50 p-2">
      {projects.map((p) => {
        const checked = selectedIds.includes(p.id);
        return (
          <li key={p.id}>
            <label
              className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition ${
                checked
                  ? "bg-[var(--accent-soft)] ring-1 ring-orange-200/60"
                  : "hover:bg-white"
              } ${disabled ? "pointer-events-none opacity-60" : ""}`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(p.id)}
                className="h-4 w-4 rounded border-slate-300 text-[var(--accent)]"
                disabled={disabled}
              />
              <span className="text-sm font-medium text-slate-800">{p.name}</span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

export default function ForemenInvitePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [projects, setProjects] = useState<ProjectMini[]>([]);
  const [foremen, setForemen] = useState<ForemanRow[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newProjectIds, setNewProjectIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editForeman, setEditForeman] = useState<ForemanRow | null>(null);
  const [editProjectIds, setEditProjectIds] = useState<string[]>([]);
  const [editPending, setEditPending] = useState(false);

  const reloadForemen = useCallback(async () => {
    const list = await apiJson<ForemanRow[]>("/api/users/foreman");
    setForemen(list);
  }, []);

  useEffect(() => {
    apiJson<AuthUser>("/api/auth/me").then((u) => {
      setUser(u);
      if (u.role !== "BOSS") router.replace("/dashboard");
    });
  }, [router]);

  useEffect(() => {
    if (!user || user.role !== "BOSS") return;
    void reloadForemen();
    apiJson<ProjectMini[]>("/api/projects")
      .then(setProjects)
      .catch(() => setProjects([]));
  }, [user, reloadForemen]);

  if (!user || user.role !== "BOSS") {
    return (
      <p className="text-slate-500" aria-live="polite">
        Зареждане…
      </p>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(null);
    setPending(true);
    try {
      const res = await fetch("/api/users/foreman", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          projectIds: newProjectIds,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Неуспешно създаване на акаунт"
        );
        return;
      }
      const assigned =
        (data.user?.projects as ProjectMini[] | undefined)?.length ??
        newProjectIds.length;
      setDone(
        assigned > 0
          ? `Бригадирът ${data.user?.name ?? name} е добавен и е вързан към ${assigned} обект(а).`
          : `Бригадирът ${data.user?.name ?? name} е добавен. Изберете обекти, за да вижда обекти в системата.`
      );
      setName("");
      setEmail("");
      setPassword("");
      setNewProjectIds([]);
      setSheetOpen(false);
      await reloadForemen();
    } finally {
      setPending(false);
    }
  }

  async function saveForemanProjects() {
    if (!editForeman) return;
    setEditPending(true);
    setError(null);
    setDone(null);
    try {
      await apiJson(`/api/users/foreman/${editForeman.id}/projects`, {
        method: "PUT",
        body: JSON.stringify({ projectIds: editProjectIds }),
      });
      setDone(`Обектите на ${editForeman.name} са обновени.`);
      setEditForeman(null);
      await reloadForemen();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Грешка при запис.");
    } finally {
      setEditPending(false);
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Бригадири"
        description="Създайте акаунт за прораб и го свържете с един или повече обекта. Без обект бригадирът няма достъп до полето."
      >
        <AddButton onClick={() => setSheetOpen(true)}>Добави бригадир</AddButton>
      </PageHeader>

      <div className={`${panel} border-blue-100/80 bg-blue-50/40`}>
        <p className="text-sm leading-relaxed text-slate-700">
          <span className="font-semibold text-[var(--brand)]">Важно:</span>{" "}
          „Бригада“ в системата е екип от работници по обект (раздел „Екип“).
          Бригадирът е <span className="font-medium">потребител</span>, който се
          връзва към <span className="font-medium">обекти</span> — тогава вижда
          график, дневник и материали за тях.
        </p>
      </div>

      <FlashMessages success={done} error={error} />

      <FormSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Нов бригадир"
        description="Имейл и парола за вход. Маркирайте обектите, които управлява."
      >
        <form onSubmit={onSubmit} className="space-y-5">
          <label className="block">
            <span className={labelText}>Име</span>
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputBase}
              required
              autoFocus
            />
          </label>
          <label className="block">
            <span className={labelText}>Имейл</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputBase}
              required
            />
          </label>
          <label className="block">
            <span className={labelText}>Парола</span>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              className={inputBase}
              required
            />
            <span className="mt-1 block text-xs text-slate-500">
              Минимум 6 знака
            </span>
          </label>
          <div>
            <span className={labelText}>Обекти (достъп)</span>
            <p className="mt-1 text-xs text-slate-500">
              Маркирайте поне един обект, за да може да влиза и да работи.
            </p>
            <div className="mt-2">
              <ProjectPicker
                projects={projects}
                selectedIds={newProjectIds}
                onChange={setNewProjectIds}
              />
            </div>
          </div>
          <button type="submit" disabled={pending} className={btnPrimary}>
            {pending ? "Запис…" : "Добави бригадир"}
          </button>
        </form>
      </FormSheet>

      <FormSheet
        open={!!editForeman}
        onClose={() => !editPending && setEditForeman(null)}
        title="Обекти на бригадир"
        description={
          editForeman
            ? `${editForeman.name} · ${editForeman.email}`
            : undefined
        }
      >
        {editForeman ? (
          <div className="space-y-4">
            <ProjectPicker
              projects={projects}
              selectedIds={editProjectIds}
              onChange={setEditProjectIds}
              disabled={editPending}
            />
            <button
              type="button"
              disabled={editPending}
              onClick={() => void saveForemanProjects()}
              className={btnPrimary}
            >
              {editPending ? "Запис…" : "Запази обектите"}
            </button>
          </div>
        ) : null}
      </FormSheet>

      <ul className="space-y-3">
        {foremen.length === 0 ? (
          <li className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
            Няма бригадири. Натиснете „Добави бригадир“.
          </li>
        ) : (
          foremen.map((f) => (
            <li key={f.id} className={listCard}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{f.name}</p>
                  <a
                    href={`mailto:${encodeURIComponent(f.email)}`}
                    className="mt-0.5 block text-sm text-[var(--brand-light)] underline-offset-2 hover:underline"
                  >
                    {f.email}
                  </a>
                  <div className="mt-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      Назначени обекти
                    </p>
                    {f.projects.length === 0 ? (
                      <p className="mt-1 text-sm text-amber-800">
                        Няма обект — бригадирът няма какво да вижда след вход.
                      </p>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {f.projects.map((p) => (
                          <span
                            key={p.id}
                            className="inline-flex rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-800"
                          >
                            {p.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className={`${btnSecondary} shrink-0`}
                  onClick={() => {
                    setEditForeman(f);
                    setEditProjectIds(f.projects.map((p) => p.id));
                  }}
                >
                  Обекти
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

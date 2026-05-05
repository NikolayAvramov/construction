"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { AuthUser } from "@/lib/types";
import { apiJson } from "@/lib/client-api";

type BossProfile = {
  id: string;
  name: string;
  email: string;
  createdAt: string | null;
  updatedAt: string | null;
};

type CompanyRow = {
  id: string;
  name: string;
  _count: { users: number; projects: number };
  bosses: BossProfile[];
  foremenCount: number;
};

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("bg-BG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

const panel =
  "rounded-xl border border-slate-200/90 bg-white p-6 shadow-sm";

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [name, setName] = useState("");
  const [bossForms, setBossForms] = useState<
    Record<string, { email: string; password: string; name: string }>
  >({});
  const [msg, setMsg] = useState<string | null>(null);
  const [msgKind, setMsgKind] = useState<"ok" | "err">("ok");
  const [editingCo, setEditingCo] = useState<string | null>(null);
  const [coNameDraft, setCoNameDraft] = useState("");

  useEffect(() => {
    apiJson<AuthUser>("/api/auth/me")
      .then((u) => {
        setUser(u);
        if (u.role !== "SUPER_ADMIN") {
          router.replace("/dashboard");
        }
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  useEffect(() => {
    if (!user || user.role !== "SUPER_ADMIN") return;
    apiJson<CompanyRow[]>("/api/companies").then(setCompanies);
  }, [user]);

  async function createCompany(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await apiJson("/api/companies", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setName("");
      const list = await apiJson<CompanyRow[]>("/api/companies");
      setCompanies(list);
      setMsgKind("ok");
      setMsg("Фирмата е създадена успешно.");
    } catch (err) {
      setMsgKind("err");
      setMsg(err instanceof Error ? err.message : "Възникна грешка.");
    }
  }

  async function saveCompanyName(companyId: string) {
    setMsg(null);
    try {
      await apiJson(`/api/companies/${companyId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: coNameDraft.trim() }),
      });
      setEditingCo(null);
      setMsgKind("ok");
      setMsg("Името на фирмата е обновено.");
      const list = await apiJson<CompanyRow[]>("/api/companies");
      setCompanies(list);
    } catch (err) {
      setMsgKind("err");
      setMsg(err instanceof Error ? err.message : "Грешка.");
    }
  }

  async function createBoss(companyId: string) {
    setMsg(null);
    const f = bossForms[companyId] ?? {
      email: "",
      password: "",
      name: "",
    };
    const name = f.name.trim();
    const email = f.email.trim();
    const password = f.password;
    if (!name || !email || !password) {
      setMsgKind("err");
      setMsg("Попълнете име, имейл и парола (мин. 6 знака).");
      return;
    }
    if (password.length < 6) {
      setMsgKind("err");
      setMsg("Паролата трябва да е поне 6 знака.");
      return;
    }
    try {
      await apiJson(`/api/companies/${companyId}/boss`, {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      setBossForms((prev) => ({
        ...prev,
        [companyId]: { email: "", password: "", name: "" },
      }));
      setMsgKind("ok");
      setMsg(
        "Управителят е създаден. Може да влезе с посочения имейл и парола."
      );
      const list = await apiJson<CompanyRow[]>("/api/companies");
      setCompanies(list);
    } catch (err) {
      setMsgKind("err");
      setMsg(err instanceof Error ? err.message : "Възникна грешка.");
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/login");
    router.refresh();
  }

  if (!user || user.role !== "SUPER_ADMIN") {
    return (
      <p className="text-center text-slate-500" aria-live="polite">
        Зареждане…
      </p>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Фирми
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
            Създайте нова фирма и добавете управител. Управителят води обекти,
            склад и финанси за съответната организация.
          </p>
        </div>
        <button
          type="button"
          onClick={() => logout()}
          className="shrink-0 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Изход
        </button>
      </div>

      <form onSubmit={createCompany} className={panel}>
        <h2 className="text-sm font-semibold text-slate-900">
          Нова фирма
        </h2>
        <label className="mt-4 block">
          <span className="text-xs font-semibold text-slate-700">
            Наименование
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-3 text-base shadow-sm"
            required
            placeholder="напр. Строй ООД"
          />
        </label>
        <button
          type="submit"
          className="mt-5 w-full rounded-lg bg-slate-900 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
        >
          Добави фирма
        </button>
      </form>

      {msg ? (
        <p
          className={
            msgKind === "ok"
              ? "rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900"
              : "rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-900"
          }
          role="status"
        >
          {msg}
        </p>
      ) : null}

      <ul className="space-y-6">
        {companies.map((c) => (
          <li key={c.id} className={panel}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              {editingCo === c.id ? (
                <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    value={coNameDraft}
                    onChange={(e) => setCoNameDraft(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void saveCompanyName(c.id)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      Запази
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingCo(null)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      Отказ
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-semibold text-slate-900">{c.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Обекти: {c._count.projects} · Общо акаунти във фирмата:{" "}
                    {c._count.users} (управители: {(c.bosses ?? []).length},
                    прораби: {c.foremenCount ?? 0})
                  </p>
                </div>
              )}
              {editingCo !== c.id ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCo(c.id);
                    setCoNameDraft(c.name);
                  }}
                  className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  Преименувай
                </button>
              ) : null}
            </div>

            <div className="mt-6 space-y-3 border-t border-slate-100 pt-6">
              <p className="text-sm font-semibold text-slate-800">
                Текущи управители
              </p>
              {(c.bosses ?? []).length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-600">
                  Няма създадени управители. Добавете първи акаунт по-долу.
                </p>
              ) : (
                <ul className="space-y-3">
                  {(c.bosses ?? []).map((b) => (
                    <li
                      key={b.id}
                      className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-3 text-sm"
                    >
                      <p className="font-semibold text-slate-900">{b.name}</p>
                      <p className="mt-0.5 text-slate-700">
                        <span className="text-slate-500">Имейл: </span>
                        <a
                          href={`mailto:${encodeURIComponent(b.email)}`}
                          className="text-blue-700 underline-offset-2 hover:underline"
                        >
                          {b.email}
                        </a>
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        Профил създаден: {formatWhen(b.createdAt)}
                        {b.updatedAt &&
                        b.updatedAt !== b.createdAt ? (
                          <>
                            {" "}
                            · Последна промяна: {formatWhen(b.updatedAt)}
                          </>
                        ) : null}
                      </p>
                      <p className="mt-1 font-mono text-[10px] text-slate-400">
                        ID: {b.id}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-6 space-y-3 border-t border-slate-100 pt-6">
              <p className="text-sm font-semibold text-slate-800">
                Нов управител за тази фирма
              </p>
              <input
                placeholder="Име и фамилия"
                value={bossForms[c.id]?.name ?? ""}
                onChange={(e) =>
                  setBossForms((prev) => ({
                    ...prev,
                    [c.id]: {
                      ...(prev[c.id] ?? { email: "", password: "", name: "" }),
                      name: e.target.value,
                    },
                  }))
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm shadow-sm"
              />
              <input
                type="email"
                placeholder="Имейл за вход"
                value={bossForms[c.id]?.email ?? ""}
                onChange={(e) =>
                  setBossForms((prev) => ({
                    ...prev,
                    [c.id]: {
                      ...(prev[c.id] ?? { email: "", password: "", name: "" }),
                      email: e.target.value,
                    },
                  }))
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm shadow-sm"
              />
              <input
                type="password"
                placeholder="Парола"
                value={bossForms[c.id]?.password ?? ""}
                onChange={(e) =>
                  setBossForms((prev) => ({
                    ...prev,
                    [c.id]: {
                      ...(prev[c.id] ?? { email: "", password: "", name: "" }),
                      password: e.target.value,
                    },
                  }))
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm shadow-sm"
              />
              <button
                type="button"
                onClick={() => createBoss(c.id)}
                className="w-full rounded-lg bg-blue-700 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800"
              >
                Създай управител
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

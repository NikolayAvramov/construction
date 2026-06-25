"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { AuthUser } from "@/lib/types";
import { apiJson } from "@/lib/client-api";
import {
  btnPrimary,
  btnPrimaryBlue,
  inputBase,
  labelText,
  listCard,
} from "@/lib/ui-classes";
import { AddButton } from "@/components/ui/add-button";
import { FlashMessages } from "@/components/ui/flash-messages";
import { FormSheet } from "@/components/ui/form-sheet";
import { PageHeader } from "@/components/ui/page-header";

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
  const [sheetCompany, setSheetCompany] = useState(false);
  const [bossSheetCompanyId, setBossSheetCompanyId] = useState<string | null>(
    null
  );

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
      setSheetCompany(false);
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
      setBossSheetCompanyId(null);
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
      <PageHeader
        title="Фирми"
        description="Преглед на организациите. Нова фирма и управител — от бутоните, не в списъка."
      >
        <button
          type="button"
          onClick={() => logout()}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Изход
        </button>
        <AddButton onClick={() => setSheetCompany(true)}>Нова фирма</AddButton>
      </PageHeader>

      <FlashMessages
        success={msgKind === "ok" ? msg : null}
        error={msgKind === "err" ? msg : null}
      />

      <FormSheet
        open={sheetCompany}
        onClose={() => setSheetCompany(false)}
        title="Нова фирма"
        description="След това добавете управител към фирмата."
      >
        <form onSubmit={createCompany} className="space-y-4">
          <label className="block">
            <span className={labelText}>Наименование</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputBase}
              required
              placeholder="напр. Строй ООД"
              autoFocus
            />
          </label>
          <button type="submit" className={btnPrimary}>
            Добави фирма
          </button>
        </form>
      </FormSheet>

      {bossSheetCompanyId ? (
        <FormSheet
          open={!!bossSheetCompanyId}
          onClose={() => setBossSheetCompanyId(null)}
          title="Нов управител"
          description={
            companies.find((c) => c.id === bossSheetCompanyId)?.name ??
            "Фирма"
          }
        >
          <div className="space-y-3">
            <input
              placeholder="Име и фамилия"
              value={bossForms[bossSheetCompanyId]?.name ?? ""}
              onChange={(e) =>
                setBossForms((prev) => ({
                  ...prev,
                  [bossSheetCompanyId]: {
                    ...(prev[bossSheetCompanyId] ?? {
                      email: "",
                      password: "",
                      name: "",
                    }),
                    name: e.target.value,
                  },
                }))
              }
              className={inputBase}
              autoFocus
            />
            <input
              type="email"
              placeholder="Имейл за вход"
              value={bossForms[bossSheetCompanyId]?.email ?? ""}
              onChange={(e) =>
                setBossForms((prev) => ({
                  ...prev,
                  [bossSheetCompanyId]: {
                    ...(prev[bossSheetCompanyId] ?? {
                      email: "",
                      password: "",
                      name: "",
                    }),
                    email: e.target.value,
                  },
                }))
              }
              className={inputBase}
            />
            <input
              type="password"
              placeholder="Парола (мин. 6 знака)"
              value={bossForms[bossSheetCompanyId]?.password ?? ""}
              onChange={(e) =>
                setBossForms((prev) => ({
                  ...prev,
                  [bossSheetCompanyId]: {
                    ...(prev[bossSheetCompanyId] ?? {
                      email: "",
                      password: "",
                      name: "",
                    }),
                    password: e.target.value,
                  },
                }))
              }
              className={inputBase}
            />
            <button
              type="button"
              onClick={() => createBoss(bossSheetCompanyId)}
              className={btnPrimaryBlue}
            >
              Създай управител
            </button>
          </div>
        </FormSheet>
      ) : null}

      <ul className="space-y-6">
        {companies.length === 0 ? (
          <li className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
            Няма фирми. Натиснете „Нова фирма“.
          </li>
        ) : null}
        {companies.map((c) => (
          <li key={c.id} className={listCard}>
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

            <div className="mt-6 border-t border-slate-100 pt-6">
              <button
                type="button"
                onClick={() => setBossSheetCompanyId(c.id)}
                className="w-full rounded-lg border border-blue-200 bg-blue-50 py-2.5 text-sm font-semibold text-blue-900 shadow-sm hover:bg-blue-100"
              >
                + Добави управител
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

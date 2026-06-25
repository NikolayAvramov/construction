"use client";

import { useEffect, useState } from "react";
import type { AuthUser } from "@/lib/types";
import { apiJson } from "@/lib/client-api";
import { ModuleCard } from "@/components/ui/module-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { btnPrimary, btnSecondary, inputBaseSm, panel } from "@/lib/ui-classes";

type CompanyBrief = { id: string; name: string };

export default function DashboardHome() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [company, setCompany] = useState<CompanyBrief | null>(null);
  const [projectCount, setProjectCount] = useState<number | null>(null);
  const [coEdit, setCoEdit] = useState(false);
  const [coDraft, setCoDraft] = useState("");
  const [coMsg, setCoMsg] = useState<string | null>(null);

  useEffect(() => {
    apiJson<AuthUser>("/api/auth/me").then(setUser);
  }, []);

  useEffect(() => {
    if (!user || user.role !== "BOSS") return;
    apiJson<Array<{ id: string; name: string }>>("/api/companies").then(
      (list) => {
        const c = list[0];
        if (c) {
          setCompany({ id: c.id, name: c.name });
          setCoDraft(c.name);
        }
      }
    );
    apiJson<unknown[]>("/api/projects")
      .then((list) => setProjectCount(list.length))
      .catch(() => setProjectCount(null));
  }, [user]);

  if (!user) {
    return (
      <p className="animate-pulse text-slate-500" aria-live="polite">
        Зареждане на работното пространство…
      </p>
    );
  }

  const boss = user.role === "BOSS";
  const firstName = user.name.split(" ")[0];
  const roleLabel = user.role === "BOSS" ? "Управител" : "Бригадир";

  async function saveCompanyName() {
    if (!company) return;
    setCoMsg(null);
    try {
      await apiJson(`/api/companies/${company.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: coDraft.trim() }),
      });
      const next = coDraft.trim();
      setCompany({ ...company, name: next });
      setCoEdit(false);
      setCoMsg("Името е обновено.");
    } catch (err) {
      setCoMsg(err instanceof Error ? err.message : "Грешка.");
    }
  }

  const today = new Date().toLocaleDateString("bg-BG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="relative overflow-hidden rounded-[var(--radius-panel)] bg-gradient-to-br from-[var(--brand)] via-[var(--brand-mid)] to-[#0a1628] px-6 py-8 text-white shadow-[var(--shadow-lg)] sm:px-8 sm:py-10">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[var(--accent)]/25 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/50">
            Работно пространство
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Здравейте, {firstName}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/75 sm:text-base">
            {boss
              ? "Обекти, екип, склад и финанси — на едно място. Започнете от обект или график за днес."
              : "Вашите обекти, присъствие и дневник — готови за работа на терена."}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold ring-1 ring-white/15">
              {roleLabel}
            </span>
            {user.company?.name ? (
              <span className="rounded-lg bg-[var(--accent)]/30 px-3 py-1.5 text-xs font-semibold text-orange-100 ring-1 ring-orange-300/30">
                {user.company.name}
              </span>
            ) : null}
            <span className="text-xs capitalize text-white/50">{today}</span>
          </div>
        </div>
      </div>

      {boss ? (
        <ul className="grid gap-3 sm:grid-cols-3">
          <StatTile
            label="Активни обекти"
            value={projectCount != null ? String(projectCount) : "—"}
            hint="Договори и локации"
          />
          <StatTile
            label="Модули"
            value="7"
            hint="Обекти · Екип · Склад · Финанси"
          />
          <StatTile
            label="Валута"
            value="EUR"
            hint="Суми и надници в евро"
          />
        </ul>
      ) : null}

      {boss && company ? (
        <div className={panel}>
          <SectionHeading
            title="Фирма"
            description="Името се вижда в отчетите и при работа с екипа."
          />
          {coEdit ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="min-w-0 flex-1">
                <span className="sr-only">Име на фирма</span>
                <input
                  value={coDraft}
                  onChange={(e) => setCoDraft(e.target.value)}
                  className={inputBaseSm}
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void saveCompanyName()}
                  className={btnPrimary}
                >
                  Запази
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCoEdit(false);
                    setCoDraft(company.name);
                    setCoMsg(null);
                  }}
                  className={btnSecondary}
                >
                  Отказ
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-lg font-bold text-[var(--brand)]">
                {company.name}
              </p>
              <button
                type="button"
                onClick={() => {
                  setCoEdit(true);
                  setCoMsg(null);
                }}
                className={btnSecondary}
              >
                Преименувай
              </button>
            </div>
          )}
          {coMsg ? (
            <p className="mt-3 text-sm font-medium text-emerald-700" role="status">
              {coMsg}
            </p>
          ) : null}
        </div>
      ) : null}

      <div>
        <SectionHeading
          title="Бърз достъп"
          description="Изберете модул — всичко е на няколко клика."
        />
        {boss ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <ModuleCard
              href="/dashboard/projects"
              title="Обекти"
              subtitle="Договори, аванси и история"
              accent="blue"
              icon={<IconBuilding />}
            />
            <ModuleCard
              href="/dashboard/workers"
              title="Екип"
              subtitle="Групи и надници по обект"
              accent="violet"
              icon={<IconUsers />}
            />
            <ModuleCard
              href="/dashboard/attendance"
              title="График"
              subtitle="Присъствие по ден"
              accent="emerald"
              icon={<IconCalendar />}
            />
            <ModuleCard
              href="/dashboard/attendance/month"
              title="Месечен календар"
              subtitle="Цял месец наведнъж"
              accent="slate"
              icon={<IconGrid />}
            />
            <ModuleCard
              href="/dashboard/inventory"
              title="Склад"
              subtitle="Материали и наличности"
              accent="amber"
              icon={<IconBox />}
            />
            <ModuleCard
              href="/dashboard/expenses"
              title="Финанси"
              subtitle="Разходи, плащания, заплати"
              accent="orange"
              icon={<IconWallet />}
            />
            <ModuleCard
              href="/dashboard/reports"
              title="Отчети"
              subtitle="Месечен обзор"
              accent="slate"
              icon={<IconChart />}
            />
            <ModuleCard
              href="/dashboard/foremen"
              title="Бригадири"
              subtitle="Достъп за прораби"
              accent="blue"
              icon={<IconHardHat />}
            />
          </ul>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ModuleCard
              href="/dashboard/projects"
              title="Обекти"
              subtitle="Възложени проекти"
              accent="blue"
              icon={<IconBuilding />}
            />
            <ModuleCard
              href="/dashboard/attendance"
              title="График"
              subtitle="Присъствие за деня"
              accent="emerald"
              icon={<IconCalendar />}
            />
            <ModuleCard
              href="/dashboard/attendance/month"
              title="Месечен изглед"
              subtitle="Целият месец"
              accent="slate"
              icon={<IconGrid />}
            />
            <ModuleCard
              href="/dashboard/daily-work"
              title="Дневник"
              subtitle="Задачи и бележки"
              accent="violet"
              icon={<IconClipboard />}
            />
            <ModuleCard
              href="/dashboard/materials"
              title="Материали"
              subtitle="Отчисляване към обект"
              accent="amber"
              icon={<IconTruck />}
            />
          </ul>
        )}
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <li className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] px-5 py-4 shadow-[var(--shadow-sm)]">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-[var(--brand)]">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
    </li>
  );
}

function IconBuilding() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function IconGrid() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

function IconBox() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function IconWallet() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function IconHardHat() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3C7 5.5 4 8 4 11v1h16v-1c0-3-3-5.5-8-8z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 12v3a2 2 0 002 2h1m13-5v3a2 2 0 01-2 2h-1M8 17v3m8-3v3" />
    </svg>
  );
}

function IconClipboard() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}

function IconTruck() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
    </svg>
  );
}

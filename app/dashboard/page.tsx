"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { AuthUser } from "@/lib/types";
import { apiJson } from "@/lib/client-api";

type CompanyBrief = { id: string; name: string };

const cardBase =
  "group flex flex-col rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md";

export default function DashboardHome() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [company, setCompany] = useState<CompanyBrief | null>(null);
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
  }, [user]);

  if (!user) {
    return (
      <p className="text-slate-500" aria-live="polite">
        Зареждане на работното пространство…
      </p>
    );
  }

  const boss = user.role === "BOSS";
  const firstName = user.name.split(" ")[0];
  const roleLabel =
    user.role === "BOSS" ? "Управител" : "Бригадир";

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
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-slate-800/20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-5 py-7 text-white shadow-lg sm:px-7 sm:py-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Construction OS
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-[1.65rem]">
            Здравейте, {firstName}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
            {boss
              ? "Управлявайте обекти, екипи и склад. Присъствие по ден или като месечен календар — от меню „График“."
              : "Присъствие и дневник по обектите ви — от меню „График“."}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/20">
              {roleLabel}
            </span>
            {user.company?.name ? (
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-200 ring-1 ring-emerald-400/30">
                {user.company.name}
              </span>
            ) : null}
            <span className="text-xs text-slate-400 capitalize">{today}</span>
          </div>
        </div>
      </div>

      {boss && company ? (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            Данни за фирмата
          </h2>
          {coEdit ? (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                value={coDraft}
                onChange={(e) => setCoDraft(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void saveCompanyName()}
                  className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
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
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  Отказ
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-base font-medium text-slate-800">
                {company.name}
              </p>
              <button
                type="button"
                onClick={() => {
                  setCoEdit(true);
                  setCoMsg(null);
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Преименувай
              </button>
            </div>
          )}
          {coMsg ? (
            <p className="mt-2 text-sm text-slate-600" role="status">
              {coMsg}
            </p>
          ) : null}
        </div>
      ) : null}

      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Бърз достъп
        </h2>
        {boss ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            <DashCard
              href="/dashboard/projects"
              title="Обекти"
              subtitle="Договори и локации"
              icon={<IconBuilding />}
            />
            <DashCard
              href="/dashboard/workers"
              title="Работници и групи"
              subtitle="Екипи на обект"
              icon={<IconUsers />}
            />
            <DashCard
              href="/dashboard/attendance"
              title="График по ден"
              subtitle="Редакция на присъствие"
              icon={<IconCalendar />}
            />
            <DashCard
              href="/dashboard/attendance/month"
              title="Месечен изглед"
              subtitle="Същата таблица на отделна страница"
              icon={<IconGrid />}
            />
            <DashCard
              href="/dashboard/inventory"
              title="Склад"
              subtitle="Материали и движения"
              icon={<IconBox />}
            />
            <DashCard
              href="/dashboard/reports"
              title="Отчети"
              subtitle="Месечен обзор"
              icon={<IconChart />}
            />
            <DashCard
              href="/dashboard/foremen"
              title="Бригадири"
              subtitle="Потребители прораби"
              icon={<IconHardHat />}
            />
          </ul>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            <DashCard
              href="/dashboard/projects"
              title="Моите обекти"
              subtitle="Възложени проекти"
              icon={<IconBuilding />}
            />
            <DashCard
              href="/dashboard/attendance"
              title="График по ден"
              subtitle="Присъствие за деня"
              icon={<IconCalendar />}
            />
            <DashCard
              href="/dashboard/attendance/month"
              title="Месечен изглед"
              subtitle="Целият месец наведнъж"
              icon={<IconGrid />}
            />
            <DashCard
              href="/dashboard/daily-work"
              title="Дневен дневник"
              subtitle="Задачи и бележки"
              icon={<IconClipboard />}
            />
            <DashCard
              href="/dashboard/materials"
              title="Материали"
              subtitle="Доставки към обекта"
              icon={<IconTruck />}
            />
          </ul>
        )}
      </div>
    </div>
  );
}

function DashCard(props: {
  href: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
}) {
  return (
    <li>
      <Link href={props.href} className={cardBase}>
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition group-hover:bg-slate-900 group-hover:text-white">
          {props.icon}
        </div>
        <span className="font-semibold text-slate-900">{props.title}</span>
        <span className="mt-0.5 text-sm text-slate-600">{props.subtitle}</span>
      </Link>
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

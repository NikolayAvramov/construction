"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { AuthUser } from "@/lib/types";
import { apiJson } from "@/lib/client-api";

type NavItem = {
  href: string;
  label: string;
  match: string;
  icon: ReactNode;
};

const navLinkBase =
  "flex min-h-[44px] min-w-[3rem] shrink-0 snap-start flex-col items-center justify-center gap-0 rounded-lg px-1.5 py-0.5 text-[9px] font-semibold leading-none transition-colors active:scale-[0.98] sm:min-h-[46px] sm:min-w-[3.5rem] sm:gap-0.5 sm:px-2 sm:py-1 sm:text-[10px] sm:leading-tight";

async function loadMeWithRetry(): Promise<AuthUser> {
  let last: Error | null = null;
  for (let i = 0; i < 4; i++) {
    if (i > 0) {
      await new Promise((r) => setTimeout(r, 120 * i));
    }
    try {
      return await apiJson<AuthUser>("/api/auth/me");
    } catch (e) {
      last = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw last ?? new Error("auth/me");
}

function isNavActive(pathname: string, match: string): boolean {
  if (match.startsWith("^")) {
    return new RegExp(match).test(pathname);
  }
  return pathname.includes(match);
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const u = await loadMeWithRetry();
        if (!cancelled) setUser(u);
      } catch {
        if (!cancelled) setUser(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (user?.role === "SUPER_ADMIN") {
      router.replace("/admin");
    }
  }, [user, router]);

  useEffect(() => {
    if (user === null) {
      router.replace("/login");
    }
  }, [user, router]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/login");
    router.refresh();
  }

  if (user === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-slate-500">
        Зареждане…
      </div>
    );
  }

  if (user === null) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-slate-500">
        Пренасочване към вход…
      </div>
    );
  }

  if (user.role === "SUPER_ADMIN") {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-slate-500">
        Пренасочване към администрация…
      </div>
    );
  }

  const boss = user.role === "BOSS";

  const bossNav: NavItem[] = [
    {
      href: "/dashboard",
      label: "Начало",
      match: "^/dashboard$",
      icon: <IconHome />,
    },
    {
      href: "/dashboard/projects",
      label: "Обекти",
      match: "projects",
      icon: <IconBuilding />,
    },
    {
      href: "/dashboard/workers",
      label: "Екип",
      match: "workers",
      icon: <IconUsers />,
    },
    {
      href: "/dashboard/attendance",
      label: "График",
      match: "attendance",
      icon: <IconCalendar />,
    },
    {
      href: "/dashboard/inventory",
      label: "Склад",
      match: "inventory",
      icon: <IconBox />,
    },
    {
      href: "/dashboard/expenses",
      label: "Разходи",
      match: "expenses",
      icon: <IconWallet />,
    },
    {
      href: "/dashboard/reports",
      label: "Отчети",
      match: "reports",
      icon: <IconChart />,
    },
  ];

  const foremanNav: NavItem[] = [
    {
      href: "/dashboard",
      label: "Начало",
      match: "^/dashboard$",
      icon: <IconHome />,
    },
    {
      href: "/dashboard/projects",
      label: "Обекти",
      match: "projects",
      icon: <IconBuilding />,
    },
    {
      href: "/dashboard/attendance",
      label: "График",
      match: "attendance",
      icon: <IconCalendar />,
    },
    {
      href: "/dashboard/daily-work",
      label: "Дневник",
      match: "daily-work",
      icon: <IconClipboard />,
    },
    {
      href: "/dashboard/materials",
      label: "Материали",
      match: "materials",
      icon: <IconTruck />,
    },
  ];

  const nav = boss ? bossNav : foremanNav;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] pb-[calc(3.85rem+env(safe-area-inset-bottom))] text-slate-900 sm:pb-[calc(4.1rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface)]/95 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-3 pb-2.5 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-4 sm:pb-3 sm:pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="min-w-0 flex-1 pr-2">
            <p className="truncate text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-500 sm:text-[10px] sm:tracking-[0.12em]">
              {boss
                ? "Управител · " + (user.company?.name ?? "Фирма")
                : "Бригадир"}
            </p>
            <p className="truncate text-sm font-semibold leading-tight text-slate-900">
              {user.name}
            </p>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="touch-manipulation shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:py-2"
          >
            Изход
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-3 py-3 sm:px-4 sm:py-5">
        {children}
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-20 border-t border-[var(--border)] bg-[var(--surface)]/98 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md"
        aria-label="Основна навигация"
      >
        <div
          className="scrollbar-hide mx-auto flex max-w-3xl snap-x snap-mandatory gap-0.5 overflow-x-auto overflow-y-hidden px-1.5 pt-1 pb-[max(0.2rem,env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch] sm:gap-1 sm:px-2 sm:pt-1.5 sm:pb-[max(0.35rem,env(safe-area-inset-bottom))]"
          role="list"
        >
          {nav.map((item) => {
            const active = isNavActive(pathname, item.match);
            return (
              <Link
                key={item.href}
                href={item.href}
                role="listitem"
                aria-current={active ? "page" : undefined}
                className={`${navLinkBase} touch-manipulation ${
                  active
                    ? "text-blue-700 ring-1 ring-blue-200/70 bg-blue-50/95"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className={active ? "text-blue-700" : "text-slate-500"}>
                  {item.icon}
                </span>
                <span className="max-w-[3.25rem] text-center sm:max-w-[3.75rem] md:max-w-none">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

const ic =
  "h-[1.125rem] w-[1.125rem] shrink-0 sm:h-5 sm:w-5";

function IconHome() {
  return (
    <svg className={ic} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function IconBuilding() {
  return (
    <svg className={ic} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg className={ic} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg className={ic} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function IconBox() {
  return (
    <svg className={ic} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function IconWallet() {
  return (
    <svg className={ic} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg className={ic} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function IconClipboard() {
  return (
    <svg className={ic} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}

function IconTruck() {
  return (
    <svg className={ic} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
    </svg>
  );
}

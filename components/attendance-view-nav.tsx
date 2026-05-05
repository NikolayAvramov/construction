"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const base =
  "flex min-h-[40px] items-center justify-center rounded-lg px-2.5 py-2 text-center text-xs font-semibold transition touch-manipulation active:scale-[0.99] sm:min-h-0 sm:rounded-xl sm:px-3 sm:py-2 sm:text-sm";

const inactive =
  "border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50";
const active = "bg-slate-900 text-white shadow-sm ring-1 ring-slate-900/10";

export function AttendanceViewNav() {
  const pathname = usePathname();
  const isMonthView = pathname.includes("/attendance/month");
  return (
    <nav
      className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2"
      aria-label="Изглед на присъствие"
    >
      <Link
        href="/dashboard/attendance"
        className={`${base} ${!isMonthView ? active : inactive}`}
      >
        <span className="sm:hidden">По ден</span>
        <span className="hidden sm:inline">Редакция по ден</span>
      </Link>
      <Link
        href="/dashboard/attendance/month"
        className={`${base} ${isMonthView ? active : inactive}`}
      >
        <span className="sm:hidden">Месец</span>
        <span className="hidden sm:inline">Календар (месец)</span>
      </Link>
    </nav>
  );
}

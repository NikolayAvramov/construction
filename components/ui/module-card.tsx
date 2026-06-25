import Link from "next/link";
import type { ReactNode } from "react";

const accents = {
  blue: "from-blue-500/15 to-blue-600/5 text-blue-700 group-hover:from-blue-600 group-hover:to-blue-700 group-hover:text-white",
  amber: "from-amber-500/15 to-amber-600/5 text-amber-800 group-hover:from-amber-500 group-hover:to-amber-600 group-hover:text-white",
  emerald:
    "from-emerald-500/15 to-emerald-600/5 text-emerald-800 group-hover:from-emerald-600 group-hover:to-emerald-700 group-hover:text-white",
  violet:
    "from-violet-500/15 to-violet-600/5 text-violet-800 group-hover:from-violet-600 group-hover:to-violet-700 group-hover:text-white",
  slate:
    "from-slate-500/15 to-slate-600/5 text-slate-700 group-hover:from-[var(--brand)] group-hover:to-[var(--brand-mid)] group-hover:text-white",
  orange:
    "from-orange-500/15 to-orange-600/5 text-orange-800 group-hover:from-[var(--accent)] group-hover:to-[var(--accent-hover)] group-hover:text-white",
} as const;

export type ModuleAccent = keyof typeof accents;

type ModuleCardProps = {
  href: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  accent?: ModuleAccent;
};

export function ModuleCard({
  href,
  title,
  subtitle,
  icon,
  accent = "slate",
}: ModuleCardProps) {
  return (
    <li>
      <Link
        href={href}
        className="group flex h-full flex-col rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)] transition hover:border-slate-300/90 hover:shadow-[var(--shadow-md)]"
      >
        <div
          className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br transition duration-200 ${accents[accent]}`}
        >
          {icon}
        </div>
        <span className="font-bold tracking-tight text-slate-900">{title}</span>
        <span className="mt-1 flex-1 text-sm leading-snug text-slate-500">
          {subtitle}
        </span>
        <span className="mt-4 text-xs font-semibold text-[var(--brand-light)] opacity-0 transition group-hover:opacity-100">
          Отвори →
        </span>
      </Link>
    </li>
  );
}

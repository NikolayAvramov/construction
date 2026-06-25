/** Споделени Tailwind класове — Construction OS design system */

export const panel =
  "rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)] sm:p-6";

export const listCard =
  "rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)] sm:p-6";

export const btnSecondary =
  "inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-[var(--shadow-sm)] transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99] lg:min-h-0 lg:px-3.5 lg:py-2";

export const btnDanger =
  "inline-flex min-h-[44px] items-center justify-center rounded-xl border border-red-200/90 bg-[var(--danger-soft)] px-4 py-2.5 text-sm font-semibold text-red-800 transition hover:bg-red-100 active:scale-[0.99] lg:min-h-0 lg:px-3.5 lg:py-2";

export const btnPrimary =
  "inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white shadow-[var(--shadow-sm)] transition hover:bg-[var(--brand-mid)] active:scale-[0.99] disabled:opacity-50 lg:min-h-0";

export const btnPrimaryAccent =
  "inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-[var(--shadow-sm)] transition hover:bg-[var(--accent-hover)] active:scale-[0.99] disabled:opacity-50 lg:min-h-0";

/** @deprecated alias */
export const btnPrimaryBlue = btnPrimaryAccent;

export const btnGhost =
  "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900";

export const labelText =
  "text-xs font-semibold uppercase tracking-wide text-slate-500";

export const inputBase =
  "mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-3.5 py-3 text-base text-slate-900 shadow-[var(--shadow-sm)] transition placeholder:text-slate-400 lg:py-2.5 lg:text-sm";

export const inputBaseSm =
  "mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2.5 text-sm text-slate-900 shadow-[var(--shadow-sm)] transition placeholder:text-slate-400";

export const badge =
  "inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide";

export const emptyStateBox =
  "rounded-[var(--radius-card)] border border-dashed border-slate-300/80 bg-slate-50/50 px-6 py-10 text-center";

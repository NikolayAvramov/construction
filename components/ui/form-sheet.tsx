"use client";

import { useEffect, useId, type ReactNode } from "react";

type FormSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
};

export function FormSheet({
  open,
  onClose,
  title,
  description,
  children,
}: FormSheetProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-[var(--brand)]/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Затвори"
        tabIndex={-1}
      />
      <div className="relative z-10 flex max-h-[min(92dvh,100%)] w-full flex-col overflow-hidden rounded-t-[var(--radius-panel)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)] sm:max-h-[min(88dvh,40rem)] sm:max-w-lg sm:rounded-[var(--radius-panel)] lg:max-w-xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--border)] bg-slate-50/80 px-4 py-4 sm:px-5">
          <div className="min-w-0 pr-2">
            <h2
              id={titleId}
              className="text-base font-bold tracking-tight text-[var(--brand)]"
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="Затвори"
          >
            <span className="text-2xl leading-none" aria-hidden>
              ×
            </span>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5">
          {children}
        </div>
      </div>
    </div>
  );
}

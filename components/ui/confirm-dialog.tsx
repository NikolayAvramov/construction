"use client";

import { useEffect, useId, useState } from "react";
import { btnDanger, btnSecondary, inputBaseSm, labelText } from "@/lib/ui-classes";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Ако е зададено, потребителят трябва да напише точно този текст */
  confirmText?: string;
  confirmTextLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Потвърди",
  cancelLabel = "Отказ",
  confirmText,
  confirmTextLabel,
  pending,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!open) {
      setTyped("");
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onCancel();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onCancel, pending]);

  if (!open) return null;

  const canConfirm =
    !pending && (!confirmText || typed.trim() === confirmText.trim());

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-[var(--brand)]/45 backdrop-blur-sm"
        onClick={() => !pending && onCancel()}
        aria-label="Затвори"
        tabIndex={-1}
      />
      <div className="relative z-10 w-full max-w-md rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-lg)] sm:p-6">
        <h2
          id={titleId}
          className="text-lg font-bold tracking-tight text-[var(--brand)]"
        >
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {description}
        </p>
        {confirmText ? (
          <label className="mt-4 block">
            <span className={labelText}>
              {confirmTextLabel ??
                `Напишете „${confirmText}“, за да потвърдите`}
            </span>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className={inputBaseSm}
              placeholder={confirmText}
              autoFocus
              disabled={pending}
            />
          </label>
        ) : null}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className={btnSecondary}
            onClick={onCancel}
            disabled={pending}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={btnDanger}
            onClick={onConfirm}
            disabled={!canConfirm}
          >
            {pending ? "Изтриване…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

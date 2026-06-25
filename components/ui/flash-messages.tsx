type FlashMessagesProps = {
  success?: string | null;
  error?: string | null;
};

export function FlashMessages({ success, error }: FlashMessagesProps) {
  if (!success && !error) return null;
  return (
    <div className="space-y-2">
      {success ? (
        <p
          className="flex items-start gap-2 rounded-xl border border-emerald-200/80 bg-[var(--success-soft)] px-4 py-3 text-sm font-medium text-emerald-900 shadow-[var(--shadow-sm)]"
          role="status"
        >
          <span className="mt-0.5 text-emerald-600" aria-hidden>
            ✓
          </span>
          {success}
        </p>
      ) : null}
      {error ? (
        <p
          className="flex items-start gap-2 rounded-xl border border-red-200/80 bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-red-900 shadow-[var(--shadow-sm)]"
          role="alert"
        >
          <span className="mt-0.5 text-red-600" aria-hidden>
            !
          </span>
          {error}
        </p>
      ) : null}
    </div>
  );
}

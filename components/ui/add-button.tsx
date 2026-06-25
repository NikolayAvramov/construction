type AddButtonProps = {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  variant?: "primary" | "secondary";
};

export function AddButton({
  onClick,
  children,
  disabled,
  variant = "primary",
}: AddButtonProps) {
  const styles =
    variant === "primary"
      ? "bg-[var(--accent)] text-white shadow-[var(--shadow-sm)] hover:bg-[var(--accent-hover)]"
      : "border border-[var(--border-strong)] bg-[var(--surface)] text-slate-700 shadow-[var(--shadow-sm)] hover:bg-slate-50";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-[44px] touch-manipulation items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-[0.99] disabled:opacity-50 lg:min-h-0 ${styles}`}
    >
      <span
        className="flex h-5 w-5 items-center justify-center rounded-md bg-white/20 text-sm leading-none"
        aria-hidden
      >
        +
      </span>
      {children}
    </button>
  );
}

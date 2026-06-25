type BrandMarkProps = {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  variant?: "light" | "dark";
};

const sizes = {
  sm: { box: "h-8 w-8 rounded-lg", icon: "h-4 w-4", title: "text-sm", sub: "text-[9px]" },
  md: { box: "h-10 w-10 rounded-xl", icon: "h-5 w-5", title: "text-base", sub: "text-[10px]" },
  lg: { box: "h-12 w-12 rounded-xl", icon: "h-6 w-6", title: "text-lg", sub: "text-xs" },
};

export function BrandMark({
  size = "md",
  showText = true,
  variant = "dark",
}: BrandMarkProps) {
  const s = sizes[size];
  const light = variant === "light";

  return (
    <div className="flex items-center gap-3">
      <div
        className={`${s.box} flex shrink-0 items-center justify-center bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] shadow-[var(--shadow-sm)]`}
        aria-hidden
      >
        <svg
          className={`${s.icon} text-white`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      </div>
      {showText ? (
        <div className="min-w-0">
          <p
            className={`${s.title} font-bold tracking-tight ${light ? "text-white" : "text-[var(--brand)]"}`}
          >
            Construction OS
          </p>
          <p
            className={`${s.sub} font-semibold uppercase tracking-[0.12em] ${light ? "text-white/70" : "text-slate-500"}`}
          >
            Управление на обекти
          </p>
        </div>
      ) : null}
    </div>
  );
}

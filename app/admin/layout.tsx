import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-900">
      <header className="border-b border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
          <Link
            href="/admin"
            className="text-sm font-semibold tracking-tight text-slate-900"
          >
            Администрация
          </Link>
          <Link
            href="/login"
            className="text-xs font-semibold text-blue-700 hover:text-blue-800"
            prefetch={false}
          >
            Смяна на акаунт
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-8">{children}</div>
    </div>
  );
}

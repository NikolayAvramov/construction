import Link from "next/link";
import { BrandMark } from "@/components/ui/brand-mark";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-canvas min-h-screen text-slate-900">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]/95 shadow-[var(--shadow-sm)] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 lg:px-8 xl:px-10">
          <Link href="/admin" className="transition opacity-100 hover:opacity-90">
            <BrandMark size="sm" />
          </Link>
          <Link
            href="/login"
            className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--brand-light)] transition hover:bg-slate-100"
            prefetch={false}
          >
            Смяна на акаунт
          </Link>
        </div>
      </header>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 lg:px-8 xl:px-10">
        {children}
      </div>
    </div>
  );
}

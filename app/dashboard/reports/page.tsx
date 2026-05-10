"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthUser } from "@/lib/types";
import { apiJson } from "@/lib/client-api";
import { formatEur } from "@/lib/format-currency";

type Monthly = {
  year: number;
  month: number;
  totalExpenses: number | string;
  totalRevenue: number | string;
  profit: number | string;
  onTheFly?: boolean;
};

export default function ReportsPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [report, setReport] = useState<Monthly | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiJson<AuthUser>("/api/auth/me").then((u) => {
      setUser(u);
      if (u.role !== "BOSS") router.replace("/dashboard");
    });
  }, [router]);

  useEffect(() => {
    if (!user || user.role !== "BOSS") return;
    apiJson<Monthly>("/api/reports/monthly")
      .then(setReport)
      .catch((e: Error) => setError(e.message));
  }, [user]);

  if (!user || user.role !== "BOSS") {
    return null;
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold tracking-tight text-slate-900">
        Месечен обзор
      </h1>
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : report ? (
        <div className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">
            Период:{" "}
            <span className="font-semibold text-slate-900">
              {report.month.toString().padStart(2, "0")}.{report.year}
            </span>
            {report.onTheFly ? (
              <span className="ml-2 text-xs font-medium text-blue-700">
                (текущи суми)
              </span>
            ) : null}
          </p>
          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
              <dt className="text-slate-600">Разходи</dt>
              <dd className="font-semibold tabular-nums text-slate-900">
                {formatEur(report.totalExpenses)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
              <dt className="text-slate-600">Приходи (плащания)</dt>
              <dd className="font-semibold tabular-nums text-slate-900">
                {formatEur(report.totalRevenue)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 pt-1">
              <dt className="font-semibold text-slate-900">Резултат</dt>
              <dd className="font-bold tabular-nums text-emerald-700">
                {formatEur(report.profit)}
              </dd>
            </div>
          </dl>
        </div>
      ) : (
        <p className="text-slate-500">Зареждане…</p>
      )}
    </div>
  );
}

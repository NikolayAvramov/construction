"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { AuthUser } from "@/lib/types";
import { apiJson } from "@/lib/client-api";

export default function ForemenInvitePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    apiJson<AuthUser>("/api/auth/me").then((u) => {
      setUser(u);
      if (u.role !== "BOSS") router.replace("/dashboard");
    });
  }, [router]);

  if (!user || user.role !== "BOSS") {
    return (
      <p className="text-slate-500" aria-live="polite">
        Зареждане…
      </p>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(null);
    setPending(true);
    try {
      const res = await fetch("/api/users/foreman", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Неуспешно създаване на акаунт"
        );
        return;
      }
      setDone(
        `Бригадирът ${data.user?.name ?? name} е добавен. Влиза с този имейл и парола.`
      );
      setName("");
      setEmail("");
      setPassword("");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Бригадири
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Добавете прораб към фирмата. Ще влиза с посочения имейл и парола.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-xl border border-slate-200/90 bg-white p-6 shadow-sm"
      >
        <label className="block">
          <span className="text-xs font-semibold text-slate-700">Име</span>
          <input
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-3 text-base shadow-sm"
            required
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-700">Имейл</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-3 text-base shadow-sm"
            required
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-700">Парола</span>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-3 text-base shadow-sm"
            required
          />
          <span className="mt-1 block text-xs text-slate-500">
            Минимум 6 знака
          </span>
        </label>

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}
        {done ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900" role="status">
            {done}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-slate-900 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
        >
          {pending ? "Запис…" : "Добави бригадир"}
        </button>
      </form>
    </div>
  );
}

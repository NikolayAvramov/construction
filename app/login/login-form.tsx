"use client";

import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { AuthUser } from "@/lib/types";
import { apiJson } from "@/lib/client-api";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

function mapNetworkError(msg: string): string {
  const low = msg.toLowerCase();
  if (
    low.includes("failed to fetch") ||
    low.includes("networkerror") ||
    low.includes("load failed") ||
    low.includes("network request failed")
  ) {
    return "Няма връзка до сървъра или Supabase. На телефон отворете същия адрес като на лаптопа (напр. http://192.168.x.x:3000, не localhost), стартирайте `npm run dev` и ползвайте една Wi‑Fi мрежа.";
  }
  return msg;
}

export function LoginForm() {
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);

  async function performLogin() {
    if (inFlight.current) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Попълнете имейл и парола.");
      return;
    }

    inFlight.current = true;
    setError(null);
    setPending(true);

    try {
      let supabase;
      try {
        supabase = createClient();
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Липсват NEXT_PUBLIC_SUPABASE_URL / ключ. Рестартирайте `npm run dev` след промяна в .env."
        );
        return;
      }

      const { data: signData, error: signErr } =
        await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

      if (signErr) {
        const raw = signErr.message ?? "Грешка при вход";
        const low = raw.toLowerCase();
        setError(
          raw === "Invalid API key" || low.includes("api key")
            ? "Невалиден API ключ. В `.env` задайте пълния anon ключ (eyJ…) или publishable от Supabase → Settings → API и рестартирайте сървъра."
            : low.includes("invalid login") || low.includes("invalid credentials")
              ? "Неверен имейл или парола."
              : mapNetworkError(raw)
        );
        return;
      }

      let session: Session | null = signData.session ?? null;
      if (!session) {
        const { data: again } = await supabase.auth.getSession();
        session = again.session ?? null;
      }
      if (!session) {
        setError(
          "Сесията не се запази в браузъра. Опитайте друг браузър, изчистете данни за сайта или ползвайте HTTPS."
        );
        return;
      }

      let me: AuthUser | undefined;
      let lastMeErr: Error | null = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, 60 * attempt));
        }
        try {
          me = await apiJson<AuthUser>("/api/auth/me");
          lastMeErr = null;
          break;
        } catch (err) {
          lastMeErr = err instanceof Error ? err : new Error(String(err));
        }
      }
      if (!me) {
        setError(
          mapNetworkError(
            lastMeErr?.message ||
              "Профилът не можа да се зареди. Пуснете supabase/schema.sql и проверете .env."
          )
        );
        await supabase.auth.signOut();
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
        });
        return;
      }

      const from = search.get("from");
      const fallback = me.role === "SUPER_ADMIN" ? "/admin" : "/dashboard";
      const raw = (from?.trim() || fallback).split("#")[0] ?? fallback;
      const path = raw.startsWith("/") && !raw.startsWith("//") ? raw : fallback;

      // Кратка пауза: на мобилни бисквитките понякога закъсняват един tick преди document navigation.
      await new Promise((r) => setTimeout(r, 150));
      window.location.href = `${window.location.origin}${path}`;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(mapNetworkError(msg));
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col justify-center bg-[var(--background)] px-4 py-10 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-[400px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_4px_24px_rgba(15,23,42,0.06)] sm:p-8">
        <div className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Construction OS
          </p>
          <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-900">
            Вход
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Въведете имейл и парола за достъп до системата
          </p>
        </div>
        {/* Без елемент „form“: подразбираното GET презарежда /login; на iOS това заобикаля React. */}
        <div
          role="form"
          aria-label="Вход в системата"
          className="mt-8 space-y-4"
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            e.stopPropagation();
            void performLogin();
          }}
        >
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">
              Имейл
            </span>
            <input
              type="text"
              name="email"
              inputMode="email"
              autoComplete="username email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-base text-slate-900 shadow-sm placeholder:text-slate-400"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">
              Парола
            </span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              enterKeyHint="go"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-base text-slate-900 shadow-sm"
            />
          </label>
          {error ? (
            <p
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          <button
            type="button"
            disabled={pending}
            onClick={(ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              void performLogin();
            }}
            className="min-h-[48px] w-full touch-manipulation rounded-lg bg-slate-900 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-slate-800 active:bg-slate-950 disabled:opacity-50 sm:text-sm"
          >
            {pending ? "Влизане…" : "Вход"}
          </button>
        </div>
        <p className="mt-6 text-center text-xs text-slate-500">
          Нужен е друг акаунт?{" "}
          <a
            href="/login?force=1"
            className="font-semibold text-blue-700 hover:underline"
          >
            Отворете отново страницата за вход
          </a>
        </p>
        <p className="mt-4 text-center">
          <Link
            href="/"
            className="text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            ← Начална страница
          </Link>
        </p>
        {process.env.NODE_ENV === "development" ? (
          <p className="mt-3 text-center">
            <Link
              href="/debug"
              className="text-xs font-medium text-amber-800 hover:underline"
            >
              Дебъг: сесия · cookies · env
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}

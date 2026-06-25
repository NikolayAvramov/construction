"use client";

import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { AuthUser } from "@/lib/types";
import { apiJson } from "@/lib/client-api";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { BrandMark } from "@/components/ui/brand-mark";
import { btnPrimary, inputBase, labelText } from "@/lib/ui-classes";

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
    <div className="app-canvas flex min-h-[100dvh]">
      <div className="relative hidden w-[42%] max-w-xl flex-col justify-between overflow-hidden bg-gradient-to-br from-[var(--brand)] via-[var(--brand-mid)] to-[#0a1628] p-10 text-white lg:flex xl:p-12">
        <div
          className="pointer-events-none absolute -right-20 top-20 h-72 w-72 rounded-full bg-[var(--accent)]/30 blur-3xl"
          aria-hidden
        />
        <BrandMark size="lg" variant="light" />
        <div className="relative mt-16 space-y-6">
          <h2 className="text-2xl font-bold leading-tight tracking-tight xl:text-3xl">
            Управление на строителни обекти — без хаос в таблици
          </h2>
          <ul className="space-y-4 text-sm leading-relaxed text-white/80">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/10 text-xs font-bold">
                1
              </span>
              Обекти, договори и екипи на едно място
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/10 text-xs font-bold">
                2
              </span>
              Склад, материали и разходи в евро
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/10 text-xs font-bold">
                3
              </span>
              График и заплати — ясно кой е работил и какво дължите
            </li>
          </ul>
        </div>
        <p className="relative text-xs text-white/40">
          © Construction OS — за строителни фирми в България
        </p>
      </div>

      <div className="flex flex-1 flex-col justify-center px-4 py-10 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))] lg:px-12">
        <div className="mx-auto w-full max-w-[420px]">
          <div className="mb-8 lg:hidden">
            <BrandMark size="md" />
          </div>
          <div className="rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-lg)] sm:p-8">
            <h1 className="text-xl font-bold tracking-tight text-[var(--brand)] sm:text-2xl">
              Вход
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Въведете имейл и парола за достъп до фирмата ви.
            </p>
            <div
              role="form"
              aria-label="Вход в системата"
              className="mt-8 space-y-5"
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                e.stopPropagation();
                void performLogin();
              }}
            >
              <label className="block">
                <span className={labelText}>Имейл</span>
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
                  className={inputBase}
                />
              </label>
              <label className="block">
                <span className={labelText}>Парола</span>
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  enterKeyHint="go"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputBase}
                />
              </label>
              {error ? (
                <p
                  className="rounded-xl border border-red-200/80 bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-red-900"
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
                className={`${btnPrimary} min-h-[52px] text-base`}
              >
                {pending ? "Влизане…" : "Вход в системата"}
              </button>
            </div>
          </div>
          <p className="mt-6 text-center text-xs text-slate-500">
            <Link
              href="/"
              className="font-semibold text-[var(--brand-light)] hover:underline"
            >
              ← Начална страница
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

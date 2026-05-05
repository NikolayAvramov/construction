"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type InfoJson = Record<string, unknown>;
type LogLine = { t: string; label: string; ok: boolean; detail: string };

function now() {
  return new Date().toLocaleTimeString("bg-BG", { hour12: false });
}

/** Само имена на cookies, видими от JS (HttpOnly липсват тук). */
function browserCookieNames(): string[] {
  if (typeof document === "undefined" || !document.cookie?.trim()) {
    return [];
  }
  return document.cookie.split(";").map((p) => p.split("=")[0]?.trim()).filter(Boolean);
}

function DebugPageInner() {
  const searchParams = useSearchParams();
  const keyQs = useMemo(() => {
    const k = searchParams.get("key");
    return k ? `?key=${encodeURIComponent(k)}` : "";
  }, [searchParams]);

  const [logs, setLogs] = useState<LogLine[]>([]);
  const [running, setRunning] = useState(false);

  const push = useCallback((label: string, ok: boolean, detail: string) => {
    setLogs((prev) => [
      ...prev,
      { t: now(), label, ok, detail: detail.slice(0, 4000) },
    ]);
  }, []);

  const runAll = useCallback(async () => {
    setRunning(true);
    setLogs([]);

    push(
      "Страница (origin)",
      true,
      `origin=${typeof window !== "undefined" ? window.location.origin : "—"} path=${typeof window !== "undefined" ? window.location.pathname : "—"}`
    );

    const fromJs = browserCookieNames();
    push(
      "Cookies в браузъра (само имена, без HttpOnly)",
      true,
      fromJs.length
        ? `${fromJs.join(", ")}\n\nАко е празно, а в /api/debug/info има cookieNames — сесията е по HttpOnly (нормално за Supabase).`
        : "няма видими от JS cookies. HttpOnly сесии се виждат само в „GET /api/debug/info“ → cookieNames."
    );

    try {
      const r = await fetch(`/api/debug/info${keyQs}`, {
        credentials: "include",
      });
      const j = (await r.json().catch(() => ({}))) as InfoJson;
      push(
        "GET /api/debug/info",
        r.ok,
        r.ok ? JSON.stringify(j, null, 2) : JSON.stringify(j, null, 2)
      );
    } catch (e) {
      push("GET /api/debug/info", false, e instanceof Error ? e.message : String(e));
    }

    try {
      const r = await fetch(`/api/debug/auth${keyQs}`, {
        credentials: "include",
      });
      const j = (await r.json().catch(() => ({}))) as InfoJson;
      push(
        "GET /api/debug/auth",
        r.ok,
        r.ok ? JSON.stringify(j, null, 2) : JSON.stringify(j, null, 2)
      );
    } catch (e) {
      push("GET /api/debug/auth", false, e instanceof Error ? e.message : String(e));
    }

    try {
      const r = await fetch("/api/auth/me", { credentials: "include" });
      const text = await r.text();
      push(
        "GET /api/auth/me",
        r.ok,
        `status ${r.status}\n${text.slice(0, 2000)}`
      );
    } catch (e) {
      push("GET /api/auth/me", false, e instanceof Error ? e.message : String(e));
    }

    try {
      const supabase = createClient();
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      push(
        "Сесия: Supabase getSession() (без токени)",
        !error && Boolean(session),
        error
          ? error.message
          : session
            ? [
                `user.id=${session.user.id}`,
                session.user.email ? `email=${session.user.email}` : null,
                `expires_at=${session.expires_at ?? "—"}`,
                `has_access_token=${Boolean(session.access_token)}`,
                `has_refresh_token=${Boolean(session.refresh_token)}`,
              ]
                .filter(Boolean)
                .join("\n")
            : "няма сесия в клиента"
      );
    } catch (e) {
      push(
        "Supabase клиент getSession()",
        false,
        e instanceof Error ? e.message : String(e)
      );
    }

    setRunning(false);
  }, [push, keyQs]);

  useEffect(() => {
    void runAll();
  }, [runAll]);

  return (
    <div className="min-h-[100dvh] bg-slate-100 px-4 py-6 text-slate-900">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-lg font-bold">
          Дебъг: сесия · cookies · env · Construction OS
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          <strong className="font-semibold text-slate-800">Env + cookies</strong>{" "}
          от сървъра в{" "}
          <code className="rounded bg-slate-200 px-1 text-xs">
            GET /api/debug/info
          </code>
          . <strong className="font-semibold text-slate-800">Сесия</strong> (JWT
          приложение + Supabase) в{" "}
          <code className="rounded bg-slate-200 px-1 text-xs">
            GET /api/debug/auth
          </code>{" "}
          и в{" "}
          <code className="rounded bg-slate-200 px-1 text-xs">
            Supabase getSession()
          </code>
          . В production API е с{" "}
          <code className="rounded bg-slate-200 px-1 text-xs">DEBUG_SECRET</code>{" "}
          и{" "}
          <code className="rounded bg-slate-200 px-1 text-xs">?key=...</code>.
        </p>
        <p className="mt-2 text-sm font-medium text-amber-900">
          Телефон: ползвай{" "}
          <code className="rounded bg-amber-100 px-1 text-xs">
            http://IP-НА-ЛАПТОПА:3000/debug
          </code>{" "}
          (не localhost на телефона). Ако в терминала има „Blocked cross-origin …
          webpack-hmr“, задай{" "}
          <code className="rounded bg-amber-100 px-1 text-xs">
            ALLOWED_DEV_ORIGINS
          </code>{" "}
          в <code className="rounded bg-amber-100 px-1 text-xs">.env</code> (IP
          от съобщението и/или IP на лаптопа) и рестартирай{" "}
          <code className="rounded bg-amber-100 px-1 text-xs">npm run dev</code>.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={running}
            onClick={() => void runAll()}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {running ? "Тестване…" : "Пусни отново"}
          </button>
          <Link
            href="/login"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800"
          >
            Към вход
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800"
          >
            Начало
          </Link>
        </div>

        <ul className="mt-6 space-y-3">
          {logs.map((l, i) => (
            <li
              key={`${l.t}-${i}`}
              className={`rounded-xl border p-3 text-sm shadow-sm ${
                l.ok
                  ? "border-emerald-200 bg-white"
                  : "border-red-200 bg-red-50/80"
              }`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold">{l.label}</span>
                <span className="text-xs text-slate-500">{l.t}</span>
              </div>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all font-mono text-xs text-slate-800">
                {l.detail}
              </pre>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function DebugPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-slate-500">
          Зареждане на дебъг…
        </div>
      }
    >
      <DebugPageInner />
    </Suspense>
  );
}

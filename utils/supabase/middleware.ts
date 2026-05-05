import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { supabasePublicEnv } from "@/utils/supabase/env";

/**
 * Обновява Supabase Auth сесията (SSR cookies). Извиква се от root `middleware.ts`.
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function updateSession(request: NextRequest): Promise<{
  response: NextResponse;
  user: User | null;
}> {
  const { url, key } = supabasePublicEnv();

  let supabaseResponse = NextResponse.next({
    request,
  });

  if (!url || !key) {
    return { response: supabaseResponse, user: null };
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response: supabaseResponse, user: user ?? null };
}

/** Append Set-Cookie headers from one response to another (e.g. after redirect). */
export function forwardCookieHeaders(from: NextResponse, to: NextResponse) {
  const headersWithSetCookie = from.headers as Headers & {
    getSetCookie?: () => string[];
  };
  if (typeof headersWithSetCookie.getSetCookie === "function") {
    for (const cookie of headersWithSetCookie.getSetCookie()) {
      to.headers.append("Set-Cookie", cookie);
    }
  }
}

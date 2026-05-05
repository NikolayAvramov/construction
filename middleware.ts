import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  forwardCookieHeaders,
  updateSession,
} from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { response: supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) {
    if (!user) {
      const login = new URL("/login", request.url);
      login.searchParams.set("from", pathname);
      const redirect = NextResponse.redirect(login);
      forwardCookieHeaders(supabaseResponse, redirect);
      return redirect;
    }
  }

  if (pathname === "/login") {
    const forceLogin = request.nextUrl.searchParams.get("force") === "1";
    if (user && !forceLogin) {
      const redirect = NextResponse.redirect(new URL("/dashboard", request.url));
      forwardCookieHeaders(supabaseResponse, redirect);
      return redirect;
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

import { debugForbiddenResponse, isDebugAccessAllowed } from "@/lib/debug-access";
import { supabasePublicEnv } from "@/utils/supabase/env";

export const dynamic = "force-dynamic";

/** Публични флагове — без секрети. */
export async function GET(req: Request) {
  if (!isDebugAccessAllowed(req)) {
    return debugForbiddenResponse();
  }

  const { url, key } = supabasePublicEnv();
  const cookieHeader = req.headers.get("cookie") ?? "";
  const cookieNames = cookieHeader
    ? [...new Set(cookieHeader.split(";").map((p) => p.split("=")[0]?.trim()).filter(Boolean))]
    : [];
  const supabaseAuthCookieHints = cookieNames.filter(
    (n) => n.includes("sb-") && n.includes("auth")
  );

  return Response.json({
    nodeEnv: process.env.NODE_ENV,
    time: new Date().toISOString(),
    nextPublicSupabaseUrl: Boolean(url),
    nextPublicSupabaseKey: Boolean(key),
    jwtSecretSet: Boolean(process.env.JWT_SECRET?.trim()),
    request: {
      host: req.headers.get("host"),
      forwardedHost: req.headers.get("x-forwarded-host"),
      forwardedProto: req.headers.get("x-forwarded-proto"),
      userAgent: req.headers.get("user-agent"),
    },
    cookieNames,
    cookieCount: cookieNames.length,
    supabaseAuthCookieHints,
  });
}

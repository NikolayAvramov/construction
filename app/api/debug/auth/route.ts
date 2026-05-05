import { getSessionFromRequest } from "@/lib/auth";
import { debugForbiddenResponse, isDebugAccessAllowed } from "@/lib/debug-access";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

/** Какво вижда сървърът за auth (без да печата токени). */
export async function GET(req: Request) {
  if (!isDebugAccessAllowed(req)) {
    return debugForbiddenResponse();
  }

  const session = await getSessionFromRequest(req);

  let supabaseUser: { id: string; email?: string } | null = null;
  let getUserError: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) {
      getUserError = error.message;
    } else if (user) {
      supabaseUser = { id: user.id, email: user.email };
    }
  } catch (e) {
    getUserError = e instanceof Error ? e.message : String(e);
  }

  return Response.json({
    time: new Date().toISOString(),
    appSession: session
      ? {
          sub: session.sub,
          role: session.role,
          email: session.email,
          companyId: session.companyId,
        }
      : null,
    supabaseGetUser: supabaseUser,
    supabaseGetUserError: getUserError,
  });
}

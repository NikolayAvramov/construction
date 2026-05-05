import { createClient } from "@/utils/supabase/server";
import { getSessionFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(_req: Request) {
  try {
    const session = await getSessionFromRequest(_req);
    if (!session) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        return Response.json(
          {
            error:
              "Липсва профил или таблиците не са създадени. Пусни supabase/schema.sql в SQL Editor.",
            code: "PROFILE_OR_SCHEMA",
          },
          { status: 403 }
        );
      }
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, email, name, role, company_id")
      .eq("id", session.sub)
      .single();

    if (error || !profile) {
      return Response.json({ error: "Profile not found" }, { status: 404 });
    }

    let company: { id: string; name: string } | null = null;
    if (profile.company_id) {
      const { data: co } = await supabase
        .from("companies")
        .select("id, name")
        .eq("id", profile.company_id)
        .maybeSingle();
      company = co;
    }

    return Response.json({
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
      companyId: profile.company_id,
      company,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: msg, code: "AUTH_ME_ERROR" }, { status: 500 });
  }
}

import { z } from "zod";
import { UserRole } from "@/lib/enums";
import { getSessionFromRequest } from "@/lib/auth";
import { createSignupClient } from "@/lib/supabase-signup";
import { loadForemanProjectMap, setForemanProjects } from "@/lib/foreman-projects";
import { requireBoss } from "@/lib/rbac";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  const denied = requireBoss(session);
  if (denied) return denied;

  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("profiles")
    .select("id, email, name")
    .eq("company_id", session!.companyId!)
    .eq("role", UserRole.FOREMAN)
    .order("name", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const list = rows ?? [];
  const projectMap = await loadForemanProjectMap(
    supabase,
    list.map((r) => r.id as string)
  );

  return Response.json(
    list.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      projects: projectMap[r.id as string] ?? [],
    }))
  );
}

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1),
  projectIds: z.array(z.string().uuid()).optional(),
});

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  const denied = requireBoss(session);
  if (denied) return denied;

  const supabase = await createClient();
  const { data: me } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", session!.sub)
    .maybeSingle();

  if (!me?.company_id) {
    return Response.json({ error: "Account has no company" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { email, password, name } = parsed.data;

  const { data: taken } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (taken) {
    return Response.json({ error: "This email is already registered." }, { status: 409 });
  }

  const signup = createSignupClient();
  const { data: authData, error: signErr } = await signup.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  });

  if (signErr) {
    return Response.json({ error: signErr.message }, { status: 400 });
  }
  if (!authData.user?.id) {
    return Response.json({ error: "Auth user not created" }, { status: 500 });
  }

  const { error: perr } = await supabase.from("profiles").insert({
    id: authData.user.id,
    email,
    name,
    role: UserRole.FOREMAN,
    company_id: me.company_id,
  });

  if (perr) {
    return Response.json({ error: perr.message }, { status: 500 });
  }

  const projectIds = parsed.data.projectIds ?? [];
  if (projectIds.length > 0) {
    const assign = await setForemanProjects(
      supabase,
      me.company_id,
      authData.user.id,
      projectIds
    );
    if (assign.error) {
      return Response.json(
        {
          error: `Бригадирът е създаден, но обектите не са назначени: ${assign.error}`,
          user: {
            id: authData.user.id,
            email,
            name,
            role: UserRole.FOREMAN,
          },
        },
        { status: 201 }
      );
    }
  }

  const projectMap = await loadForemanProjectMap(supabase, [authData.user.id]);

  return Response.json(
    {
      user: {
        id: authData.user.id,
        email,
        name,
        role: UserRole.FOREMAN,
        projects: projectMap[authData.user.id] ?? [],
      },
    },
    { status: 201 }
  );
}

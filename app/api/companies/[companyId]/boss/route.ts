import { z } from "zod";
import { UserRole } from "@/lib/enums";
import { getSessionFromRequest } from "@/lib/auth";
import { createSignupClient } from "@/lib/supabase-signup";
import { createServiceRoleClient } from "@/lib/supabase-service";
import { requireSuperAdmin } from "@/lib/rbac";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

type Params = { params: Promise<{ companyId: string }> };

export async function POST(req: Request, { params }: Params) {
  const session = await getSessionFromRequest(req);
  const denied = requireSuperAdmin(session);
  if (denied) return denied;

  const { companyId } = await params;
  const supabase = await createClient();

  const { data: company, error: coErr } = await supabase
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .maybeSingle();

  if (coErr || !company) {
    return Response.json({ error: "Company not found" }, { status: 404 });
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

  const service = createServiceRoleClient();
  let newUserId: string;

  if (service) {
    const { data: created, error: admErr } =
      await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name },
      });

    if (admErr) {
      return Response.json(
        { error: admErr.message || "Грешка при създаване на акаунт (Admin API)." },
        { status: 400 }
      );
    }
    if (!created.user?.id) {
      return Response.json(
        {
          error:
            "Admin API не върна потребител. Провери настройките на Auth в Supabase.",
        },
        { status: 500 }
      );
    }
    newUserId = created.user.id;

    const { error: profErr } = await service.from("profiles").upsert(
      {
        id: newUserId,
        email,
        name,
        role: UserRole.BOSS,
        company_id: companyId,
      },
      { onConflict: "id" }
    );

    if (profErr) {
      return Response.json(
        {
          error: `Акаунтът е създаден, но профилът не е записан: ${profErr.message}. Провери таблицата public.profiles.`,
        },
        { status: 500 }
      );
    }
  } else {
    const signupOnly = createSignupClient();
    const { data: authData, error: signErr } = await signupOnly.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: undefined,
      },
    });

    if (signErr) {
      return Response.json(
        {
          error: `${signErr.message} Ако ползваш само anon ключ: сложи SUPABASE_SERVICE_ROLE_KEY в .env (Dashboard → Settings → API → service_role) и рестартирай сървъра, или изключи потвърждение на имейл за регистрация.`,
        },
        { status: 400 }
      );
    }

    if (!authData.user?.id) {
      return Response.json(
        {
          error:
            "Регистрацията не върна потребител. Обикновено това е при включено потвърждение по имейл — добави SUPABASE_SERVICE_ROLE_KEY в .env или изключи „Confirm email“ в Supabase → Authentication → Providers → Email.",
        },
        { status: 500 }
      );
    }
    newUserId = authData.user.id;

    const { error: profErr } = await supabase.from("profiles").upsert(
      {
        id: newUserId,
        email,
        name,
        role: UserRole.BOSS,
        company_id: companyId,
      },
      { onConflict: "id" }
    );

    if (profErr) {
      return Response.json(
        {
          error: `Auth OK, но профилът не е записан: ${profErr.message}. Провери RLS за profiles или сложи SUPABASE_SERVICE_ROLE_KEY.`,
        },
        { status: 500 }
      );
    }
  }

  return Response.json(
    {
      id: newUserId,
      email,
      name,
      role: UserRole.BOSS,
      companyId,
    },
    { status: 201 }
  );
}

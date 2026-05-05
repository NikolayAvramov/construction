import { z } from "zod";
import { UserRole } from "@/lib/enums";
import { getSessionFromRequest } from "@/lib/auth";
import { requireAuth } from "@/lib/rbac";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().min(1),
});

type Params = { params: Promise<{ companyId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { companyId } = await params;
  const session = await getSessionFromRequest(req);
  const denied = requireAuth(session);
  if (denied) return denied;

  if (session!.role === UserRole.BOSS) {
    if (session!.companyId !== companyId) {
      return Response.json({ error: "Нямате достъп." }, { status: 403 });
    }
  } else if (session!.role === UserRole.SUPER_ADMIN) {
    // ok
  } else {
    return Response.json({ error: "Нямате достъп." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("companies")
    .update({ name: parsed.data.name })
    .eq("id", companyId)
    .select("id, name")
    .maybeSingle();

  if (error || !row) {
    return Response.json({ error: "Фирмата не е намерена." }, { status: 404 });
  }

  return Response.json(row);
}

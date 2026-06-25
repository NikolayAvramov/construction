import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";
import { setForemanProjects } from "@/lib/foreman-projects";
import { requireBoss } from "@/lib/rbac";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  projectIds: z.array(z.string().uuid()),
});

type Params = { params: Promise<{ userId: string }> };

export async function PUT(req: Request, { params }: Params) {
  const { userId } = await params;
  const session = await getSessionFromRequest(req);
  const denied = requireBoss(session);
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Невалиден списък обекти.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const result = await setForemanProjects(
    supabase,
    session!.companyId!,
    userId,
    parsed.data.projectIds
  );

  if (result.error) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  return Response.json({ ok: true });
}

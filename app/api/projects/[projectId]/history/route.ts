import { UserRole } from "@/lib/enums";
import { getSessionFromRequest } from "@/lib/auth";
import { fetchProjectHistory } from "@/lib/project-history";
import { foremanCanAccessProject, requireAuth } from "@/lib/rbac";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ projectId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { projectId } = await params;
  const session = await getSessionFromRequest(req);
  const denied = requireAuth(session);
  if (denied) return denied;

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, company_id, name")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) {
    return Response.json({ error: "Обектът не е намерен." }, { status: 404 });
  }

  if (session!.role === UserRole.FOREMAN) {
    const ok = await foremanCanAccessProject(
      supabase,
      session!.sub,
      projectId
    );
    if (!ok) {
      return Response.json({ error: "Нямате достъп до този обект." }, { status: 403 });
    }
  } else if (session!.role === UserRole.BOSS) {
    if (project.company_id !== session!.companyId) {
      return Response.json({ error: "Нямате достъп до този обект." }, { status: 403 });
    }
  } else if (session!.role !== UserRole.SUPER_ADMIN) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const includeFinance = session!.role === UserRole.BOSS;
  const items = await fetchProjectHistory(supabase, projectId, {
    includeFinance,
  });

  return Response.json({ projectName: project.name, items });
}

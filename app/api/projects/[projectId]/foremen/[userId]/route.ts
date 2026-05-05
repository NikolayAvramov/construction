import { getSessionFromRequest } from "@/lib/auth";
import { requireBoss } from "@/lib/rbac";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ projectId: string; userId: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const { projectId, userId } = await params;
  const session = await getSessionFromRequest(_req);
  const denied = requireBoss(session);
  if (denied) return denied;

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("company_id")
    .eq("id", projectId)
    .maybeSingle();

  if (!project || project.company_id !== session!.companyId) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  await supabase
    .from("project_foremen")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", userId);

  return new Response(null, { status: 204 });
}

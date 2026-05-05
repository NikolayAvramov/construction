import { z } from "zod";
import { UserRole } from "@/lib/enums";
import { getSessionFromRequest } from "@/lib/auth";
import { requireBoss } from "@/lib/rbac";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const assignSchema = z.object({ userId: z.string().min(1) });

type Params = { params: Promise<{ projectId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { projectId } = await params;
  const session = await getSessionFromRequest(req);
  const denied = requireBoss(session);
  if (denied) return denied;

  const supabase = await createClient();
  const { data: project, error: pe } = await supabase
    .from("projects")
    .select("company_id")
    .eq("id", projectId)
    .maybeSingle();

  if (pe || !project || project.company_id !== session!.companyId) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  const { data: links, error } = await supabase
    .from("project_foremen")
    .select("user_id, profiles(id, name, email)")
    .eq("project_id", projectId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const list = (links ?? []).map((l) => {
    const row = l as unknown as {
      user_id: string;
      profiles:
        | { id: string; name: string; email: string }
        | { id: string; name: string; email: string }[]
        | null;
    };
    const prof = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      userId: row.user_id,
      id: prof?.id,
      name: prof?.name,
      email: prof?.email,
    };
  });

  return Response.json(list);
}

export async function POST(req: Request, { params }: Params) {
  const { projectId } = await params;
  const session = await getSessionFromRequest(req);
  const denied = requireBoss(session);
  if (denied) return denied;

  const supabase = await createClient();
  const { data: project, error: pe } = await supabase
    .from("projects")
    .select("company_id")
    .eq("id", projectId)
    .maybeSingle();

  if (pe || !project || project.company_id !== session!.companyId) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data: foreman, error: fe } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", parsed.data.userId)
    .eq("role", UserRole.FOREMAN)
    .eq("company_id", project.company_id)
    .maybeSingle();

  if (fe || !foreman) {
    return Response.json(
      { error: "Потребителят не е прораб на тази фирма." },
      { status: 400 }
    );
  }

  const { data: link, error: ie } = await supabase
    .from("project_foremen")
    .insert({
      project_id: projectId,
      user_id: foreman.id,
    })
    .select("*")
    .maybeSingle();

  if (ie) {
    if (ie.code === "23505") {
      const { data: existing } = await supabase
        .from("project_foremen")
        .select("*")
        .eq("project_id", projectId)
        .eq("user_id", foreman.id)
        .maybeSingle();
      return Response.json(existing, { status: 201 });
    }
    return Response.json({ error: ie.message }, { status: 500 });
  }

  return Response.json(link, { status: 201 });
}

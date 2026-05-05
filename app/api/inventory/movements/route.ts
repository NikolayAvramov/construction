import { UserRole } from "@/lib/enums";
import { getSessionFromRequest } from "@/lib/auth";
import { foremanCanAccessProject } from "@/lib/rbac";
import { requireAuth } from "@/lib/rbac";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  const denied = requireAuth(session);
  if (denied) return denied;

  const projectId = new URL(req.url).searchParams.get("projectId") ?? undefined;

  if (!session!.companyId) {
    return Response.json({ error: "No company" }, { status: 403 });
  }

  const supabase = await createClient();

  const { data: items } = await supabase
    .from("inventory_items")
    .select("id")
    .eq("company_id", session!.companyId);
  const itemIds = (items ?? []).map((i) => i.id);

  if (itemIds.length === 0) {
    return Response.json([]);
  }

  if (session!.role === UserRole.BOSS) {
    let q = supabase
      .from("material_movements")
      .select("*")
      .in("inventory_item_id", itemIds);

    if (projectId) {
      q = q.eq("project_id", projectId);
    }

    const { data: rows, error } = await q.order("created_at", { ascending: false });
    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    const enriched = await Promise.all(
      (rows ?? []).map(async (m) => {
        const [{ data: item }, { data: proj }] = await Promise.all([
          supabase.from("inventory_items").select("*").eq("id", m.inventory_item_id).maybeSingle(),
          m.project_id
            ? supabase.from("projects").select("id, name").eq("id", m.project_id).maybeSingle()
            : Promise.resolve({ data: null }),
        ]);
        return { ...m, item, project: proj };
      })
    );

    return Response.json(enriched);
  }

  if (!projectId) {
    return Response.json(
      { error: "projectId query required for foreman" },
      { status: 400 }
    );
  }

  const ok = await foremanCanAccessProject(supabase, session!.sub, projectId);
  if (!ok) {
    return Response.json({ error: "No access to this project" }, { status: 403 });
  }

  const { data: proj } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("company_id", session!.companyId)
    .maybeSingle();
  if (!proj) {
    return Response.json({ error: "No access to this project" }, { status: 403 });
  }

  const { data: rows, error } = await supabase
    .from("material_movements")
    .select("*")
    .eq("project_id", projectId)
    .in("inventory_item_id", itemIds)
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const enriched = await Promise.all(
    (rows ?? []).map(async (m) => {
      const { data: item } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("id", m.inventory_item_id)
        .maybeSingle();
      return { ...m, item };
    })
  );

  return Response.json(enriched);
}

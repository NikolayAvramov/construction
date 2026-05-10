import { z } from "zod";
import { WorkerRole } from "@/lib/enums";
import { getSessionFromRequest } from "@/lib/auth";
import { requireBoss } from "@/lib/rbac";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const workerUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.nativeEnum(WorkerRole).optional(),
  groupId: z.preprocess(
    (val) => (val === "" ? null : val),
    z.union([z.string().min(1), z.null()]).optional()
  ),
  /** Явно null — без z.coerce отпред, иначе null става 0. */
  nadnik: z
    .preprocess((val) => {
      if (val === undefined) return undefined;
      if (val === null) return null;
      if (typeof val === "number" && Number.isFinite(val)) return val;
      if (typeof val === "string" && val.trim() !== "") {
        const n = Number(val.replace(",", "."));
        return Number.isFinite(n) ? n : val;
      }
      return val;
    }, z.union([z.number().nonnegative(), z.null()]).optional()),
});

type Params = { params: Promise<{ workerId: string }> };

function looksLikeMissingNadnikColumn(message: string) {
  return /nadnik|does not exist|schema cache|Could not find|unknown column/i.test(
    message
  );
}

export async function PATCH(req: Request, { params }: Params) {
  const { workerId } = await params;
  const session = await getSessionFromRequest(req);
  const denied = requireBoss(session);
  if (denied) return denied;

  const supabase = await createClient();

  const { data: worker } = await supabase
    .from("workers")
    .select("id, group_id")
    .eq("id", workerId)
    .maybeSingle();

  if (!worker) {
    return Response.json({ error: "Работникът не е намерен." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = workerUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Невалидни данни.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const d = parsed.data;

  if (worker.group_id) {
    const { data: grp } = await supabase
      .from("worker_groups")
      .select("project_id")
      .eq("id", worker.group_id)
      .maybeSingle();

    if (!grp?.project_id) {
      return Response.json({ error: "Работникът не е намерен." }, { status: 404 });
    }

    const { data: project } = await supabase
      .from("projects")
      .select("company_id")
      .eq("id", grp.project_id)
      .maybeSingle();

    if (!project || project.company_id !== session!.companyId) {
      return Response.json({ error: "Няма достъп до този работник." }, { status: 403 });
    }
  } else {
    const gid = d.groupId ?? null;
    if (!gid) {
      return Response.json(
        {
          error:
            "Този работник няма екип. Изберете група в формата и запазете отново.",
        },
        { status: 400 }
      );
    }
    const { data: ng } = await supabase
      .from("worker_groups")
      .select("project_id")
      .eq("id", gid)
      .maybeSingle();
    if (!ng?.project_id) {
      return Response.json({ error: "Групата не е намерена." }, { status: 404 });
    }
    const { data: p2 } = await supabase
      .from("projects")
      .select("company_id")
      .eq("id", ng.project_id)
      .maybeSingle();
    if (!p2 || p2.company_id !== session!.companyId) {
      return Response.json({ error: "Няма достъп до тази група." }, { status: 403 });
    }
  }

  if (d.groupId) {
    const { data: ng } = await supabase
      .from("worker_groups")
      .select("project_id")
      .eq("id", d.groupId)
      .maybeSingle();
    if (!ng) {
      return Response.json({ error: "Group not found" }, { status: 404 });
    }
    const { data: p2 } = await supabase
      .from("projects")
      .select("company_id")
      .eq("id", ng.project_id)
      .maybeSingle();
    if (!p2 || p2.company_id !== session!.companyId) {
      return Response.json({ error: "Group not found" }, { status: 404 });
    }
  }

  const patch: Record<string, unknown> = {};
  if (d.name !== undefined) patch.name = d.name;
  if (d.role !== undefined) patch.role = d.role;
  if (d.groupId !== undefined) patch.group_id = d.groupId;
  if (d.nadnik !== undefined) patch.nadnik = d.nadnik;

  const migrationSql =
    "ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS nadnik numeric(12, 2);";

  let { data: w, error } = await supabase
    .from("workers")
    .update(patch)
    .eq("id", workerId)
    .select("*")
    .maybeSingle();

  if (
    error &&
    patch.nadnik !== undefined &&
    looksLikeMissingNadnikColumn(error.message)
  ) {
    const { nadnik: _drop, ...patchRest } = patch;
    if (Object.keys(patchRest).length > 0) {
      const second = await supabase
        .from("workers")
        .update(patchRest)
        .eq("id", workerId)
        .select("*")
        .maybeSingle();
      w = second.data;
      error = second.error;
    }
  }

  if (error) {
    const msg = error.message;
    const migrationHint = looksLikeMissingNadnikColumn(msg)
      ? ` Пуснете в Supabase SQL Editor: ${migrationSql}`
      : "";
    return Response.json({ error: msg + migrationHint }, { status: 500 });
  }

  if (!w) {
    return Response.json(
      { error: "Промяната не беше записана (няма ред или няма права)." },
      { status: 404 }
    );
  }

  const nadnik =
    w.nadnik == null || w.nadnik === ""
      ? null
      : Number(w.nadnik);

  return Response.json({
    id: w.id,
    name: w.name,
    role: w.role,
    groupId: w.group_id,
    nadnik: Number.isFinite(nadnik) ? nadnik : null,
    createdAt: w.created_at,
    updatedAt: w.updated_at,
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { workerId } = await params;
  const session = await getSessionFromRequest(_req);
  const denied = requireBoss(session);
  if (denied) return denied;

  const supabase = await createClient();
  const { data: worker } = await supabase
    .from("workers")
    .select("id, group_id")
    .eq("id", workerId)
    .maybeSingle();

  if (!worker) {
    return Response.json({ error: "Работникът не е намерен." }, { status: 404 });
  }

  if (worker.group_id) {
    const { data: grp } = await supabase
      .from("worker_groups")
      .select("project_id")
      .eq("id", worker.group_id)
      .maybeSingle();
    if (grp?.project_id) {
      const { data: project } = await supabase
        .from("projects")
        .select("company_id")
        .eq("id", grp.project_id)
        .maybeSingle();
      if (!project || project.company_id !== session!.companyId) {
        return Response.json({ error: "Работникът не е намерен." }, { status: 404 });
      }
    }
  } else {
    return Response.json({ error: "Работникът не е намерен." }, { status: 404 });
  }

  const { error } = await supabase.from("workers").delete().eq("id", workerId);
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return new Response(null, { status: 204 });
}

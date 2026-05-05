import { z } from "zod";
import { ProjectStatus, UserRole } from "@/lib/enums";
import { getSessionFromRequest } from "@/lib/auth";
import type { SessionPayload } from "@/lib/auth";
import { resolveCompanyId } from "@/lib/company-scope";
import { mapProject } from "@/lib/map-supabase";
import { projectPublic } from "@/lib/projects";
import { requireAuth, requireBoss } from "@/lib/rbac";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type GroupSummary = { id: string; name: string; workerCount: number };

async function listWithSummaries(
  supabase: Awaited<ReturnType<typeof createClient>>,
  session: SessionPayload,
  rows: Record<string, unknown>[]
) {
  const mapped = rows.map((r) =>
    mapProject(r as Parameters<typeof mapProject>[0])
  );
  const projectIds = mapped.map((p) => p.id);

  const groupsByProject: Record<string, GroupSummary[]> = {};
  const paymentsByProject: Record<string, number> = {};

  if (projectIds.length > 0) {
    const { data: groups, error: gErr } = await supabase
      .from("worker_groups")
      .select("id, name, project_id")
      .in("project_id", projectIds);

    if (gErr) {
      return Response.json({ error: gErr.message }, { status: 500 });
    }

    const groupIds = (groups ?? []).map((g) => g.id as string);
    const workerCounts: Record<string, number> = {};

    if (groupIds.length > 0) {
      const { data: wrows, error: wErr } = await supabase
        .from("workers")
        .select("group_id")
        .in("group_id", groupIds);

      if (wErr) {
        return Response.json({ error: wErr.message }, { status: 500 });
      }

      for (const w of wrows ?? []) {
        const gid = w.group_id as string | null;
        if (gid) workerCounts[gid] = (workerCounts[gid] ?? 0) + 1;
      }
    }

    for (const g of groups ?? []) {
      const pid = g.project_id as string;
      const arr = groupsByProject[pid] ?? [];
      arr.push({
        id: g.id as string,
        name: g.name as string,
        workerCount: workerCounts[g.id as string] ?? 0,
      });
      groupsByProject[pid] = arr;
    }

    if (session.role === UserRole.BOSS) {
      const { data: pays, error: pErr } = await supabase
        .from("payments")
        .select("project_id, amount")
        .in("project_id", projectIds);

      if (pErr) {
        return Response.json({ error: pErr.message }, { status: 500 });
      }

      for (const pay of pays ?? []) {
        const pid = pay.project_id as string;
        const amt = Number(pay.amount);
        paymentsByProject[pid] =
          (paymentsByProject[pid] ?? 0) + (Number.isFinite(amt) ? amt : 0);
      }
    }
  }

  const isForeman = session.role === UserRole.FOREMAN;

  return Response.json(
    mapped.map((p) => {
      const base = projectPublic(isForeman, p);
      return {
        ...base,
        groups: groupsByProject[p.id] ?? [],
        ...(session.role === UserRole.BOSS
          ? { paymentsReceivedTotal: paymentsByProject[p.id] ?? 0 }
          : {}),
      };
    })
  );
}

const createSchema = z.object({
  name: z.string().min(1),
  location: z.string().min(1),
  totalPrice: z.coerce.number().nonnegative(),
  advancePayment: z.boolean().optional(),
  advanceAmount: z.coerce.number().nonnegative().optional().nullable(),
  status: z.nativeEnum(ProjectStatus).optional(),
});

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  const denied = requireAuth(session);
  if (denied) return denied;

  const url = new URL(req.url);
  const scope = resolveCompanyId(session!, url);
  if ("error" in scope) {
    return Response.json({ error: scope.error }, { status: 400 });
  }
  const { companyId } = scope;
  const supabase = await createClient();

  if (session!.role === UserRole.FOREMAN) {
    const { data: links } = await supabase
      .from("project_foremen")
      .select("project_id")
      .eq("user_id", session!.sub);

    const ids = (links ?? []).map((l) => l.project_id).filter(Boolean);
    if (ids.length === 0) {
      return Response.json([]);
    }

    const { data: rows, error } = await supabase
      .from("projects")
      .select("*")
      .eq("company_id", companyId)
      .in("id", ids)
      .order("name", { ascending: true });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return listWithSummaries(supabase, session!, rows ?? []);
  }

  const { data: rows, error } = await supabase
    .from("projects")
    .select("*")
    .eq("company_id", companyId)
    .order("name", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return listWithSummaries(supabase, session!, rows ?? []);
}

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  const denied = requireBoss(session);
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const d = parsed.data;
  const supabase = await createClient();

  const insert = {
    company_id: session!.companyId!,
    name: d.name,
    location: d.location,
    total_price: d.totalPrice,
    advance_payment: d.advancePayment ?? false,
    advance_amount:
      d.advancePayment && d.advanceAmount != null ? d.advanceAmount : null,
    status: d.status ?? ProjectStatus.ACTIVE,
  };

  const { data: row, error } = await supabase
    .from("projects")
    .insert(insert)
    .select("*")
    .single();

  if (error || !row) {
    return Response.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
  }

  return Response.json(mapProject(row as Parameters<typeof mapProject>[0]), {
    status: 201,
  });
}

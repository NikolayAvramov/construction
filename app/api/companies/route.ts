import { z } from "zod";
import { UserRole } from "@/lib/enums";
import { getSessionFromRequest } from "@/lib/auth";
import { requireAuth, requireBoss, requireSuperAdmin } from "@/lib/rbac";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(1),
});

async function countForCompany(
  companyId: string
): Promise<{ users: number; projects: number }> {
  const supabase = await createClient();
  const { count: users } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId);
  const { count: projects } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId);
  return { users: users ?? 0, projects: projects ?? 0 };
}

function mapBossRow(row: {
  id: string;
  name: string;
  email: string;
  created_at?: string;
  updated_at?: string;
}) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  const denied = requireAuth(session);
  if (denied) return denied;

  const supabase = await createClient();

  if (session!.role === UserRole.SUPER_ADMIN) {
    const { data: list, error } = await supabase
      .from("companies")
      .select("id, name")
      .order("name", { ascending: true });
    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    const companyIds = (list ?? []).map((c) => c.id);
    const bossesByCompany: Record<
      string,
      ReturnType<typeof mapBossRow>[]
    > = {};
    const foremenCountByCompany: Record<string, number> = {};

    if (companyIds.length > 0) {
      const { data: profRows, error: profErr } = await supabase
        .from("profiles")
        .select("id, name, email, company_id, role, created_at, updated_at")
        .in("company_id", companyIds);

      if (profErr) {
        return Response.json({ error: profErr.message }, { status: 500 });
      }

      const bossList: typeof profRows = [];
      for (const row of profRows ?? []) {
        const cid = row.company_id as string;
        if (!cid) continue;
        if (row.role === UserRole.BOSS) {
          bossList.push(row);
        } else if (row.role === UserRole.FOREMAN) {
          foremenCountByCompany[cid] = (foremenCountByCompany[cid] ?? 0) + 1;
        }
      }

      bossList.sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return ta - tb;
      });

      for (const row of bossList) {
        const cid = row.company_id as string;
        const arr = bossesByCompany[cid] ?? [];
        arr.push(
          mapBossRow(
            row as {
              id: string;
              name: string;
              email: string;
              created_at?: string;
              updated_at?: string;
            }
          )
        );
        bossesByCompany[cid] = arr;
      }
    }

    const withCounts = await Promise.all(
      (list ?? []).map(async (c) => ({
        ...c,
        _count: await countForCompany(c.id),
        bosses: bossesByCompany[c.id] ?? [],
        foremenCount: foremenCountByCompany[c.id] ?? 0,
      }))
    );
    return Response.json(withCounts);
  }

  const bossDenied = requireBoss(session);
  if (bossDenied) return bossDenied;

  const { data: one, error } = await supabase
    .from("companies")
    .select("id, name")
    .eq("id", session!.companyId!)
    .maybeSingle();

  if (error || !one) {
    return Response.json({ error: "Company not found" }, { status: 404 });
  }

  return Response.json([
    {
      ...one,
      _count: await countForCompany(one.id),
    },
  ]);
}

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  const denied = requireSuperAdmin(session);
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data: company, error } = await supabase
    .from("companies")
    .insert({ name: parsed.data.name })
    .select("id, name")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(
    {
      ...company,
      _count: { users: 0, projects: 0 },
    },
    { status: 201 }
  );
}

import { getSessionFromRequest } from "@/lib/auth";
import { generateMonthlyReport } from "@/lib/reports";
import { requireSuperAdmin } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  const denied = requireSuperAdmin(session);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const year = body?.year ?? new Date().getUTCFullYear();
  const month = body?.month ?? new Date().getUTCMonth() + 1;
  const report = await generateMonthlyReport(year, month);
  return Response.json(report, { status: 201 });
}

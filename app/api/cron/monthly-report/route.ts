import { generateMonthlyReport } from "@/lib/reports";

export const dynamic = "force-dynamic";

/** Call from Vercel Cron or external scheduler with Authorization: Bearer CRON_SECRET */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "CRON_SECRET not configured" }, { status: 501 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const now = new Date();
  const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  const year = prev.getUTCFullYear();
  const month = prev.getUTCMonth() + 1;
  const report = await generateMonthlyReport(year, month);
  return Response.json({ ok: true, report });
}

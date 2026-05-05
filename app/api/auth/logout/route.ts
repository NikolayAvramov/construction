import { cookies } from "next/headers";
import { COOKIE } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const jar = await cookies();
  jar.delete(COOKIE);

  return Response.json({ ok: true });
}

import { z } from "zod";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Вход през сървъра — задава Supabase auth cookies в отговора.
 * По-надеждно от signInWithPassword в браузъра при някои комбинации publishable ключ + @supabase/ssr.
 */
export async function POST(req: Request) {
  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Невалиден email или парола.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { email, password } = parsed.data;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const msg = error.message ?? "Грешка при вход";
    const status =
      msg.toLowerCase().includes("invalid login") ||
      msg.toLowerCase().includes("invalid credentials")
        ? 401
        : 400;
    return NextResponse.json({ error: msg }, { status });
  }

  // NextResponse подобрява прикачването на Set-Cookie в App Router (резервен път).
  return NextResponse.json({ ok: true });
}

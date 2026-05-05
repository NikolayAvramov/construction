/**
 * Дебъг маршрути: отворени в development, или в production само с ?key=DEBUG_SECRET.
 */
export function isDebugAccessAllowed(req: Request): boolean {
  if (process.env.NODE_ENV === "development") {
    return true;
  }
  const secret = process.env.DEBUG_SECRET?.trim();
  if (!secret) {
    return false;
  }
  const key = new URL(req.url).searchParams.get("key");
  return key === secret;
}

export function debugForbiddenResponse() {
  return Response.json(
    {
      error: "Debug API е изключен.",
      hint:
        "Локално: NODE_ENV=development. Production: задай DEBUG_SECRET в .env и подай ?key=... в URL.",
    },
    { status: 403 }
  );
}

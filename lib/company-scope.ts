import { UserRole } from "@/lib/enums";
import type { SessionPayload } from "@/lib/auth";

/**
 * За филтриране на проекти/склад и т.н.
 * - BOSS/FOREMAN: винаги session.companyId
 * - SUPER_ADMIN: само ако има ?companyId= в URL (или по-късно от тяло на POST)
 */
export function resolveCompanyId(
  session: SessionPayload,
  url: URL
): { companyId: string } | { error: string } {
  if (session.role === UserRole.SUPER_ADMIN) {
    const cid = url.searchParams.get("companyId");
    if (!cid) {
      return { error: "companyId required (query)" };
    }
    return { companyId: cid };
  }
  if (!session.companyId) {
    return { error: "Account has no company" };
  }
  return { companyId: session.companyId };
}

/** За POST заявки — companyId в JSON тяло при SUPER_ADMIN */
export function resolveCompanyIdFromBody(
  session: SessionPayload,
  body: { companyId?: string | null }
): { companyId: string } | { error: string } {
  if (session.role === UserRole.SUPER_ADMIN) {
    const cid = body.companyId;
    if (!cid || typeof cid !== "string") {
      return { error: "companyId required in body" };
    }
    return { companyId: cid };
  }
  if (!session.companyId) {
    return { error: "Account has no company" };
  }
  return { companyId: session.companyId };
}

export type Role = "SUPER_ADMIN" | "BOSS" | "FOREMAN";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  companyId: string | null;
  company?: { id: string; name: string } | null;
};

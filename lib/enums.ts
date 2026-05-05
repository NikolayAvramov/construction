/** Стойности като в Prisma schema — без връзка към база. */

export const UserRole = {
  SUPER_ADMIN: "SUPER_ADMIN",
  BOSS: "BOSS",
  FOREMAN: "FOREMAN",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const ProjectStatus = {
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
} as const;
export type ProjectStatus =
  (typeof ProjectStatus)[keyof typeof ProjectStatus];

export const WorkerRole = {
  WORKER: "WORKER",
  FOREMAN: "FOREMAN",
} as const;
export type WorkerRole = (typeof WorkerRole)[keyof typeof WorkerRole];

export const ExpenseCategory = {
  MATERIALS: "MATERIALS",
  SALARIES: "SALARIES",
  INSURANCE: "INSURANCE",
  OTHER: "OTHER",
} as const;
export type ExpenseCategory =
  (typeof ExpenseCategory)[keyof typeof ExpenseCategory];

/** Етикети за показване в UI (API остава на английски enums). */

export function expenseCategoryBg(code: string): string {
  const m: Record<string, string> = {
    MATERIALS: "Материали",
    SALARIES: "Заплати",
    INSURANCE: "Осигуровки",
    OTHER: "Други",
  };
  return m[code] ?? code;
}

export function projectStatusBg(code: string): string {
  const m: Record<string, string> = {
    ACTIVE: "Активен",
    COMPLETED: "Приключен",
  };
  return m[code] ?? code;
}

export function workerRoleBg(code: string): string {
  const m: Record<string, string> = {
    WORKER: "Работник",
    FOREMAN: "Бригадир",
  };
  return m[code] ?? code;
}

/** Стойност + етикет за полета тип select */
export const EXPENSE_CATEGORY_OPTIONS = [
  { value: "MATERIALS", label: "Материали" },
  { value: "SALARIES", label: "Заплати" },
  { value: "INSURANCE", label: "Осигуровки" },
  { value: "OTHER", label: "Други" },
] as const;

export const PROJECT_STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Активен" },
  { value: "COMPLETED", label: "Приключен" },
] as const;

export const WORKER_ROLE_OPTIONS = [
  { value: "WORKER", label: "Работник" },
  { value: "FOREMAN", label: "Бригадир (работник)" },
] as const;

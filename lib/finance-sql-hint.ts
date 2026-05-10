/** Вече има подсказка или миграционни пътища — не дублираме. */
const DEDUPE_RE =
  /20260510200000|20260510203000|20260510210000|NOTIFY pgrst|Липсва (колона )?company_id/i;

const EXPENSES_COMPANY_ID_HINT =
  " Липсва колона company_id в expenses или кешът на API е стар: " +
  "supabase/migrations/20260510200000_expenses_company_id.sql " +
  "или bundle 20260510203000_bundle_expenses_company_and_salary_payouts.sql. " +
  "Скриптът трябва да завършва с NOTIFY pgrst, 'reload schema';";

const WORKER_PAYOUT_HINT =
  " Липсва таблицата worker_salary_payouts: " +
  "supabase/migrations/20260510210000_worker_salary_payouts.sql " +
  "или същият bundle; NOTIFY pgrst, 'reload schema';";

/** Подсказка за липсващи колони/таблици (PostgREST schema cache). */
export function appendFinanceSqlHint(message: string): string {
  if (DEDUPE_RE.test(message)) return "";

  if (/worker_salary_payouts/i.test(message)) {
    return WORKER_PAYOUT_HINT;
  }

  if (
    /'company_id' column of 'expenses'|company_id.*\bexpenses\b|\bexpenses\b.*company_id/i.test(
      message
    ) ||
    /schema cache|could not find the.*column/i.test(message) ||
    (/does not exist/i.test(message) && /expenses|company_id/i.test(message))
  ) {
    return EXPENSES_COMPANY_ID_HINT;
  }

  return "";
}

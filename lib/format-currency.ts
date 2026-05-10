/** Суми в евро за интерфейса (локал bg-BG). */
export function formatEur(
  value: unknown,
  maxFractionDigits: number = 2
): string {
  if (value === null || value === undefined || value === "") return "—";
  const n =
    typeof value === "string" ? Number(value.replace(",", ".")) : Number(value);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("bg-BG", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: maxFractionDigits,
  }).format(n);
}

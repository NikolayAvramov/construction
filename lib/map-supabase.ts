/** Map snake_case от PostgREST към camelCase за API отговори (съвместимост с предишния Prisma формат). */

export function mapProject(row: {
  id: string;
  company_id: string;
  name: string;
  location: string;
  total_price: string | number;
  advance_payment: boolean;
  advance_amount: string | number | null;
  status: string;
  created_at?: string;
  updated_at?: string;
}) {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    location: row.location,
    totalPrice: row.total_price,
    advancePayment: row.advance_payment,
    advanceAmount: row.advance_amount,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

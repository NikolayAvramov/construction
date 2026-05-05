import type { ProjectStatus } from "@/lib/enums";

export function projectPublic(
  foreman: boolean,
  p: {
    id: string;
    name: string;
    location: string;
    totalPrice: unknown;
    advancePayment: boolean;
    advanceAmount: unknown | null;
    status: ProjectStatus | string;
  }
) {
  if (foreman) {
    return {
      id: p.id,
      name: p.name,
      location: p.location,
      status: p.status,
      totalPrice: p.totalPrice,
      advancePayment: p.advancePayment,
      advanceAmount: p.advanceAmount,
    };
  }
  return {
    id: p.id,
    name: p.name,
    location: p.location,
    totalPrice: p.totalPrice,
    advancePayment: p.advancePayment,
    advanceAmount: p.advanceAmount,
    status: p.status,
  };
}

export type ReqStatus = "pending" | "approved" | "rejected" | "picked_up" | "returned" | "cancelled";
export type ReqAction = "approve" | "reject" | "pickup" | "return" | "cancel";

export function todayISO(d = new Date()): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

/** Pickup must be today or later, and return on or after pickup. */
export function isValidReservationDates(pickup: string, ret: string, today: string): boolean {
  return !!pickup && !!ret && pickup >= today && ret >= pickup;
}

/** Which buttons a person sees for a reservation. */
export function actionsFor(status: string, staff: boolean, isOwner: boolean): ReqAction[] {
  if (status === "pending") return staff ? ["approve", "reject", "cancel"] : isOwner ? ["cancel"] : [];
  if (!staff) return [];
  if (status === "approved") return ["pickup", "cancel"];
  if (status === "picked_up") return ["return"];
  return [];
}

/** Picked up and the return date has passed. */
export function isOverdue(status: string, returnDate: string | null, today: string): boolean {
  return status === "picked_up" && !!returnDate && returnDate < today;
}

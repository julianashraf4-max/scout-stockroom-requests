/** Shared local display validation; database functions remain authoritative. */
export function validBooking(pickup: string, due: string, now = new Date()): boolean {
  const start = new Date(pickup).getTime();
  const end = new Date(due).getTime();
  return Number.isFinite(start) && Number.isFinite(end) && start >= now.getTime() + 24 * 60 * 60 * 1000 && end > start;
}
export function localDateTime(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
export function storeClosed(date = new Date()): boolean {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', weekday: 'long' }).format(date) === 'Friday';
}
export function bookingOverdue(status: string, due: string | null, now = new Date()): boolean {
  return status === 'picked_up' && due !== null && new Date(due).getTime() < now.getTime();
}
export function cartTotal(lines: { quantity: number; price: number }[]): number {
  return lines.reduce((sum, line) => sum + line.quantity * line.price, 0);
}

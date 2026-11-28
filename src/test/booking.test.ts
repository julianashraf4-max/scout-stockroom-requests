import { describe, expect, it } from 'vitest';
import { validBooking, storeClosed, bookingOverdue, cartTotal } from '@/lib/booking';
import { actionsFor } from '@/lib/reservations';
describe('booking and store rules', () => {
  const now = new Date('2026-11-28T08:00:00Z');
  it('requires exactly 24 hours minimum advance notice', () => {
    expect(validBooking('2026-11-29T07:59:59Z','2026-11-30T08:00:00Z',now)).toBe(false);
    expect(validBooking('2026-11-29T08:00:00Z','2026-11-30T08:00:00Z',now)).toBe(true);
  });
  it('requires return after pickup', () => {
    expect(validBooking('2026-11-29T08:00:00Z','2026-11-29T08:00:00Z',now)).toBe(false);
  });
  it('blocks Store ordering and collection on Cairo Fridays only', () => {
    expect(storeClosed(new Date('2026-12-04T10:00:00Z'))).toBe(true);
    expect(storeClosed(new Date('2026-12-03T22:00:00Z'))).toBe(true);
    expect(storeClosed(new Date('2026-12-05T10:00:00Z'))).toBe(false);
  });
  it('allows Warehouse reservations for Fridays', () => {
    expect(validBooking('2026-12-04T10:00:00Z','2026-12-05T10:00:00Z',now)).toBe(true);
  });
  it('does not expire pending or approved bookings after four or six hours', () => {
    for (const hours of [4,6,72]) {
      const later = new Date(now.getTime()+hours*3600000);
      expect(bookingOverdue('approved','2026-11-28T07:00:00Z',later)).toBe(false);
      expect(actionsFor('pending',true,false)).toEqual(['approve','reject','cancel']);
      expect(actionsFor('approved',true,false)).toEqual(['pickup','cancel']);
    }
  });
  it('marks outstanding equipment overdue but not returned equipment', () => {
    expect(bookingOverdue('picked_up','2026-11-28T07:59:59Z',now)).toBe(true);
    expect(bookingOverdue('returned','2026-11-28T07:59:59Z',now)).toBe(false);
  });
  it('totals a multiple-product cart', () => {
    expect(cartTotal([{quantity:2,price:35},{quantity:3,price:10}])).toBe(100);
  });
});

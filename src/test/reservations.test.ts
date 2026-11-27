import { describe, expect, it } from "vitest";
import { actionsFor, isOverdue, isValidReservationDates } from "@/lib/reservations";

describe("reservations", () => {
  it("rejects a return date before the pickup date", () => {
    expect(isValidReservationDates("2026-12-05", "2026-12-04", "2026-12-01")).toBe(false);
  });
  it("rejects a pickup date in the past", () => {
    expect(isValidReservationDates("2026-11-30", "2026-12-04", "2026-12-01")).toBe(false);
  });
  it("accepts same-day pickup and return", () => {
    expect(isValidReservationDates("2026-12-01", "2026-12-01", "2026-12-01")).toBe(true);
  });
  it("lets staff approve, reject or cancel a pending reservation", () => {
    expect(actionsFor("pending", true, false)).toEqual(["approve", "reject", "cancel"]);
  });
  it("lets a member only cancel their own pending reservation", () => {
    expect(actionsFor("pending", false, true)).toEqual(["cancel"]);
    expect(actionsFor("approved", false, true)).toEqual([]);
  });
  it("lets staff mark pickup after approval and return after pickup", () => {
    expect(actionsFor("approved", true, false)).toEqual(["pickup", "cancel"]);
    expect(actionsFor("picked_up", true, false)).toEqual(["return"]);
  });
  it("marks picked-up equipment overdue after its return date", () => {
    expect(isOverdue("picked_up", "2026-12-01", "2026-12-02")).toBe(true);
    expect(isOverdue("returned", "2026-12-01", "2026-12-02")).toBe(false);
  });
});

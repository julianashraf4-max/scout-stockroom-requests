import { describe, expect, it } from "vitest";
import { isQuantityAvailable } from "@/lib/stock";

describe("stock quantity rules", () => {
  it("rejects a request for 3 units when only 2 are available", () => {
    expect(isQuantityAvailable(2, 3)).toBe(false);
  });

  it("allows a request for 2 units when exactly 2 are available", () => {
    expect(isQuantityAvailable(2, 2)).toBe(true);
  });

  it("rejects zero and fractional request quantities", () => {
    expect(isQuantityAvailable(5, 0)).toBe(false);
    expect(isQuantityAvailable(5, 1.5)).toBe(false);
  });
});

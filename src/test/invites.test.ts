import { describe, expect, it } from "vitest";
import { roleForInvitation } from "@/lib/invites";

describe("invitation roles", () => {
  it("assigns keeper to a keeper invitation when an admin already exists", () => {
    expect(roleForInvitation(true, "keeper")).toBe("keeper");
  });

  it("assigns admin to an admin invitation when an admin already exists", () => {
    expect(roleForInvitation(true, "admin")).toBe("admin");
  });

  it("keeps the first account as admin to bootstrap an owner", () => {
    expect(roleForInvitation(false, "member")).toBe("admin");
  });
});

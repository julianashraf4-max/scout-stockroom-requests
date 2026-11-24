import type { Key } from "@/lib/i18n";
export type Role = "admin" | "keeper" | "member";
export const roleKey: Record<Role, Key> = { admin: "roleAdmin", keeper: "roleKeeper", member: "roleMember" };
export function topRole(roles: string[]): Role {
  return roles.includes("admin") ? "admin" : roles.includes("keeper") ? "keeper" : "member";
}

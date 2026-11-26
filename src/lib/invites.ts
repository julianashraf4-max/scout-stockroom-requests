import type { Role } from "@/components/store/roles";

export const inviteRoles = ["admin", "keeper", "member"] as const satisfies readonly Role[];

export function roleForInvitation(hasAdmin: boolean, invitedRole: Role): Role {
  return hasAdmin ? invitedRole : "admin";
}

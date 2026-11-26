import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Copy, Plus, Ticket, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePrefs } from "@/lib/prefs";
import { inviteRoles } from "@/lib/invites";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type Role, roleKey, topRole } from "./roles";

export function UsersTab({ meId }: { meId: string }) {
  const { t } = usePrefs();
  const qc = useQueryClient();
  const [inviteRole, setInviteRole] = useState<Role>("member");
  const users = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      return (p ?? []).map((u) => ({ ...u, role: topRole((r ?? []).filter((x) => x.user_id === u.id).map((x) => x.role)) }));
    },
  });
  const invites = useQuery({
    queryKey: ["invitation-codes"],
    queryFn: async () => ((await supabase.from("invitation_codes").select("*").order("created_at", { ascending: false })).data ?? []),
  });

  async function setRole(userId: string, role: Role) {
    const del = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (del.error) { toast.error(del.error.message); return; }
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) { toast.error(error.message); return; }
    toast.success(t("roleChanged"));
    qc.invalidateQueries({ queryKey: ["users"] });
  }

  async function createInvite() {
    const { error } = await supabase.rpc("create_role_invite_code", { _role: inviteRole });
    if (error) { toast.error(error.message); return; }
    toast.success(t("inviteCreated"));
    qc.invalidateQueries({ queryKey: ["invitation-codes"] });
  }

  async function deleteInvite(code: string) {
    const { error } = await supabase.from("invitation_codes").delete().eq("code", code);
    if (error) { toast.error(error.message); return; }
    toast.success(t("deleted"));
    qc.invalidateQueries({ queryKey: ["invitation-codes"] });
  }

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);
    toast.success(t("copied"));
  }

  return (
    <div className="mt-4 space-y-6">
      <section className="rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-bold"><Ticket className="h-5 w-5" />{t("invites")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("invitesHint")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
              <SelectTrigger className="w-36" aria-label={t("inviteRole")}><SelectValue /></SelectTrigger>
              <SelectContent>
                {inviteRoles.map((role) => <SelectItem key={role} value={role}>{t(roleKey[role])}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button className="gap-1" onClick={createInvite}><Plus className="h-4 w-4" />{t("newInvite")}</Button>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {(invites.data ?? []).map((invite) => {
            const used = invite.used_count >= invite.max_uses;
            return (
              <div key={invite.code} className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
                <code dir="ltr" className="flex-1 font-mono text-lg font-bold tracking-widest">{invite.code}</code>
                <Badge variant="outline">{t(roleKey[invite.role])}</Badge>
                <Badge variant={used ? "secondary" : "default"}>{used ? t("used") : t("active")}</Badge>
                <Button size="icon" variant="outline" aria-label={t("copyCode")} onClick={() => copyCode(invite.code)}><Copy className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" aria-label={t("del")} onClick={() => deleteInvite(invite.code)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        {(users.data ?? []).map((u) => (
          <div key={u.id} className="flex items-center gap-3 rounded-xl border bg-card p-4">
            <div className="min-w-0 flex-1">
              <p className="font-bold">{u.full_name || t("noName")}</p>
              <p className="truncate text-xs text-muted-foreground" dir="ltr">{u.email}</p>
            </div>
            <Select value={u.role} disabled={u.id === meId} onValueChange={(v) => setRole(u.id, v as Role)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(roleKey) as Role[]).map((k) => <SelectItem key={k} value={k}>{t(roleKey[k])}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        ))}
      </section>
    </div>
  );
}

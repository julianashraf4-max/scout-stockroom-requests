import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePrefs } from "@/lib/prefs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type Role, roleKey, topRole } from "./roles";

export function UsersTab({ meId }: { meId: string }) {
  const { t } = usePrefs();
  const qc = useQueryClient();
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
  async function setRole(userId: string, role: Role) {
    const del = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (del.error) { toast.error(del.error.message); return; }
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) { toast.error(error.message); return; }
    toast.success(t("roleChanged"));
    qc.invalidateQueries({ queryKey: ["users"] });
  }
  return (
    <div className="mt-4 space-y-2">
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
    </div>
  );
}

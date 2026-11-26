import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePrefs } from "@/lib/prefs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { nameMap } from "./names";
import { isQuantityAvailable } from "@/lib/stock";

export function RequestsTab({ staff }: { staff: boolean }) {
  const { t, lang } = usePrefs();
  const qc = useQueryClient();
  const reqs = useQuery({
    queryKey: ["requests"],
    queryFn: async () => {
      const { data } = await supabase.from("requests").select("*, items(name, unit, quantity)").order("created_at", { ascending: false });
      const pm = await nameMap((data ?? []).map((r) => r.user_id));
      return (data ?? []).map((r) => ({ ...r, who: pm.get(r.user_id) ?? "" }));
    },
  });
  async function decide(id: string, approve: boolean) {
    const { error } = await supabase.rpc("decide_request", { _request_id: id, _approve: approve });
    if (error) { toast.error(error.message.includes("الكمية في المخزن غير كافية") ? t("notEnoughStock") : error.message); return; }
    toast.success(approve ? t("approved") : t("rejected"));
    qc.invalidateQueries({ queryKey: ["requests"] });
    qc.invalidateQueries({ queryKey: ["items"] });
  }
  const label = { pending: t("pending"), approved: t("approved"), rejected: t("rejected") } as Record<string, string>;
  const list = reqs.data ?? [];
  if (!list.length) return <p className="py-10 text-center text-muted-foreground">{t("noRequests")}</p>;
  return (
    <div className="mt-4 space-y-2">
      {list.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
          <div className="flex-1">
            <p className="font-bold">{r.items?.name} × {r.quantity} {r.items?.unit}</p>
            <p className="text-xs text-muted-foreground">{staff && `${r.who} · `}{new Date(r.created_at).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB")}{r.note && ` · ${r.note}`}</p>
            {staff && r.status === "pending" && !isQuantityAvailable(r.items?.quantity ?? 0, r.quantity) && <p className="mt-1 text-xs text-destructive">{t("notEnoughStock")}</p>}
          </div>
          <Badge variant={r.status === "rejected" ? "destructive" : r.status === "approved" ? "default" : "outline"}>{label[r.status]}</Badge>
          {staff && r.status === "pending" && (
            <div className="flex gap-1">
              <Button size="sm" className="gap-1" disabled={!isQuantityAvailable(r.items?.quantity ?? 0, r.quantity)} onClick={() => decide(r.id, true)}><Check className="h-4 w-4" />{t("approve")}</Button>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => decide(r.id, false)}><X className="h-4 w-4" />{t("reject")}</Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

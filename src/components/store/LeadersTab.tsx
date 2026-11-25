import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePrefs } from "@/lib/prefs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MediaImage, ImagePicker } from "./MediaImage";

export function LeadersTab({ staff }: { staff: boolean }) {
  const { t, lang } = usePrefs();
  const qc = useQueryClient();
  const leaders = useQuery({ queryKey: ["leaders"], queryFn: async () => (await supabase.from("leaders").select("*").order("name")).data ?? [] });
  const shifts = useQuery({ queryKey: ["shifts"], queryFn: async () => (await supabase.from("duty_shifts").select("*, leaders(name)").order("duty_date").order("start_time")).data ?? [] });
  const [lf, setLf] = useState<{ name: string; phone: string; title: string; image_url: string | null } | null>(null);
  const [sf, setSf] = useState<{ leader_id: string; duty_date: string; start_time: string; end_time: string; notes: string } | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const all = leaders.data ?? [];
  const current = all.filter((l) => l.is_current);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["leaders"] }); qc.invalidateQueries({ queryKey: ["shifts"] }); };

  async function toggle(id: string, v: boolean) {
    const { error } = await supabase.from("leaders").update({ is_current: v }).eq("id", id);
    if (error) toast.error(error.message); refresh();
  }
  async function delLeader(id: string) {
    await supabase.from("duty_shifts").delete().eq("leader_id", id);
    const { error } = await supabase.from("leaders").delete().eq("id", id);
    if (error) toast.error(error.message); else toast.success(t("deleted")); refresh();
  }
  async function delShift(id: string) {
    const { error } = await supabase.from("duty_shifts").delete().eq("id", id);
    if (error) toast.error(error.message); refresh();
  }
  async function saveLeader(e: React.FormEvent) {
    e.preventDefault(); if (!lf) return;
    const { error } = await supabase.from("leaders").insert({ ...lf, phone: lf.phone || null, title: lf.title || null });
    if (error) { toast.error(error.message); return; }
    toast.success(t("added")); setLf(null); refresh();
  }
  async function saveShift(e: React.FormEvent) {
    e.preventDefault(); if (!sf || !sf.leader_id) return;
    const { error } = await supabase.from("duty_shifts").insert({ ...sf, start_time: sf.start_time || null, end_time: sf.end_time || null, notes: sf.notes || null });
    if (error) { toast.error(error.message); return; }
    toast.success(t("added")); setSf(null); refresh();
  }

  return (
    <div className="mt-4 space-y-8">
      <section>
        <h2 className="mb-3 font-display text-xl font-bold">{t("currentLeaders")}</h2>
        {current.length === 0 ? <p className="text-muted-foreground">{t("noCurrent")}</p> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {current.map((l) => (
              <div key={l.id} className="flex items-center gap-3 rounded-xl border-2 border-primary bg-card p-4 shadow-soft">
                <MediaImage path={l.image_url} alt={l.name} className="h-14 w-14 rounded-full" />
                <div><p className="font-bold">{l.name}</p><p className="text-xs text-muted-foreground">{l.title}</p>{l.phone && <a dir="ltr" className="text-sm text-primary" href={`tel:${l.phone}`}>{l.phone}</a>}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">{t("schedule")}</h2>
          {staff && <Button size="sm" className="gap-1" disabled={!all.length} onClick={() => setSf({ leader_id: all[0]?.id ?? "", duty_date: today, start_time: "", end_time: "", notes: "" })}><Plus className="h-4 w-4" />{t("newShift")}</Button>}
        </div>
        {(shifts.data ?? []).length === 0 ? <p className="text-muted-foreground">{t("noItems")}</p> : (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted"><tr><th className="p-3 text-start">{t("date")}</th><th className="p-3 text-start">{t("leader")}</th><th className="p-3 text-start">{t("from")}</th><th className="p-3 text-start">{t("to")}</th><th className="p-3 text-start">{t("notes")}</th>{staff && <th />}</tr></thead>
              <tbody>
                {(shifts.data ?? []).map((s) => (
                  <tr key={s.id} className={s.duty_date === today ? "bg-accent/30" : s.duty_date < today ? "opacity-60" : ""}>
                    <td className="p-3">{new Date(s.duty_date).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", { weekday: "short", day: "numeric", month: "short" })}{s.duty_date === today && <Badge className="ms-2">{t("today")}</Badge>}</td>
                    <td className="p-3 font-bold">{s.leaders?.name}</td>
                    <td className="p-3">{s.start_time?.slice(0, 5) ?? "—"}</td>
                    <td className="p-3">{s.end_time?.slice(0, 5) ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">{s.notes}</td>
                    {staff && <td className="p-3"><Button size="icon" variant="ghost" aria-label={t("del")} onClick={() => delShift(s.id)}><Trash2 className="h-4 w-4" /></Button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">{t("allLeaders")}</h2>
          {staff && <Button size="sm" className="gap-1" onClick={() => setLf({ name: "", phone: "", title: "", image_url: null })}><Plus className="h-4 w-4" />{t("newLeader")}</Button>}
        </div>
        <div className="space-y-2">
          {all.map((l) => (
            <div key={l.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
              <MediaImage path={l.image_url} alt={l.name} className="h-10 w-10 rounded-full" />
              <div className="flex-1"><p className="font-bold">{l.name}</p><p className="text-xs text-muted-foreground">{l.title}</p></div>
              {staff ? (
                <>
                  <Button size="sm" variant={l.is_current ? "default" : "outline"} className="gap-1" onClick={() => toggle(l.id, !l.is_current)}><Star className="h-4 w-4" />{t("isCurrent")}</Button>
                  <Button size="icon" variant="ghost" aria-label={t("del")} onClick={() => delLeader(l.id)}><Trash2 className="h-4 w-4" /></Button>
                </>
              ) : l.is_current && <Badge>{t("isCurrent")}</Badge>}
            </div>
          ))}
        </div>
      </section>

      <Dialog open={!!lf} onOpenChange={(o) => !o && setLf(null)}>
        <DialogContent dir={lang === "ar" ? "rtl" : "ltr"}>
          <DialogHeader><DialogTitle>{t("newLeader")}</DialogTitle></DialogHeader>
          {lf && <form onSubmit={saveLeader} className="space-y-3">
            <ImagePicker value={lf.image_url} folder="leaders" onChange={(p) => setLf({ ...lf, image_url: p })} />
            <div className="space-y-1"><Label>{t("name")}</Label><Input required value={lf.name} onChange={(e) => setLf({ ...lf, name: e.target.value })} /></div>
            <div className="space-y-1"><Label>{t("title")}</Label><Input value={lf.title} onChange={(e) => setLf({ ...lf, title: e.target.value })} /></div>
            <div className="space-y-1"><Label>{t("phone")}</Label><Input dir="ltr" value={lf.phone} onChange={(e) => setLf({ ...lf, phone: e.target.value })} /></div>
            <Button type="submit" className="w-full">{t("save")}</Button>
          </form>}
        </DialogContent>
      </Dialog>

      <Dialog open={!!sf} onOpenChange={(o) => !o && setSf(null)}>
        <DialogContent dir={lang === "ar" ? "rtl" : "ltr"}>
          <DialogHeader><DialogTitle>{t("newShift")}</DialogTitle></DialogHeader>
          {sf && <form onSubmit={saveShift} className="space-y-3">
            <div className="space-y-1"><Label>{t("leader")}</Label>
              <select className="h-9 w-full rounded-md border bg-background px-3" value={sf.leader_id} onChange={(e) => setSf({ ...sf, leader_id: e.target.value })}>
                {all.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select></div>
            <div className="space-y-1"><Label>{t("date")}</Label><Input type="date" required value={sf.duty_date} onChange={(e) => setSf({ ...sf, duty_date: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label>{t("from")}</Label><Input type="time" value={sf.start_time} onChange={(e) => setSf({ ...sf, start_time: e.target.value })} /></div>
              <div className="space-y-1"><Label>{t("to")}</Label><Input type="time" value={sf.end_time} onChange={(e) => setSf({ ...sf, end_time: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label>{t("notes")}</Label><Input value={sf.notes} onChange={(e) => setSf({ ...sf, notes: e.target.value })} /></div>
            <Button type="submit" className="w-full">{t("save")}</Button>
          </form>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

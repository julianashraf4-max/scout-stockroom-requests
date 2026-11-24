import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Minus, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePrefs } from "@/lib/prefs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MediaImage, ImagePicker } from "./MediaImage";

type Item = { id: string; name: string; category: string; quantity: number; unit: string; notes: string | null; image_url: string | null };
const empty = { name: "", category: "", quantity: 1, unit: "", notes: "", image_url: null as string | null };

export function ItemsTab({ staff }: { staff: boolean }) {
  const { t } = usePrefs();
  const qc = useQueryClient();
  const items = useQuery({ queryKey: ["items"], queryFn: async () => ((await supabase.from("items").select("*").order("name")).data ?? []) as Item[] });
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Partial<Item> | null>(null);
  const [req, setReq] = useState<Item | null>(null);
  const list = (items.data ?? []).filter((i) => i.name.includes(q) || i.category.includes(q));

  async function adjust(id: string, qty: number) {
    const { error } = await supabase.from("items").update({ quantity: Math.max(0, qty), updated_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["items"] });
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex gap-2">
        <Input placeholder={t("search")} value={q} onChange={(e) => setQ(e.target.value)} />
        {staff && <Button className="gap-1" onClick={() => setEdit({ ...empty })}><Plus className="h-4 w-4" />{t("newItem")}</Button>}
      </div>
      {list.length === 0 && <p className="py-10 text-center text-muted-foreground">{t("noItems")}</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((i) => (
          <div key={i.id} className="overflow-hidden rounded-xl border bg-card shadow-soft">
            <MediaImage path={i.image_url} alt={i.name} className="h-36 w-full" />
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-display text-lg font-bold">{i.name}</h3>
                  <p className="text-xs text-muted-foreground">{i.category}</p>
                </div>
                <Badge variant={i.quantity > 0 ? "secondary" : "destructive"}>{i.quantity} {i.unit}</Badge>
              </div>
              {i.notes && <p className="mt-2 text-sm text-muted-foreground">{i.notes}</p>}
              <div className="mt-3 flex items-center gap-2">
                {staff && (
                  <>
                    <Button size="icon" variant="outline" aria-label="+" onClick={() => adjust(i.id, i.quantity + 1)}><Plus className="h-4 w-4" /></Button>
                    <Button size="icon" variant="outline" aria-label="-" onClick={() => adjust(i.id, i.quantity - 1)}><Minus className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" aria-label="edit" onClick={() => setEdit(i)}><Pencil className="h-4 w-4" /></Button>
                  </>
                )}
                <div className="flex-1" />
                {i.quantity > 0 && <Button size="sm" variant="secondary" onClick={() => setReq(i)}>{t("request")}</Button>}
              </div>
            </div>
          </div>
        ))}
      </div>
      {edit && <ItemDialog item={edit} onClose={() => setEdit(null)} />}
      {req && <RequestDialog item={req} onClose={() => setReq(null)} />}
    </div>
  );
}

function ItemDialog({ item, onClose }: { item: Partial<Item>; onClose: () => void }) {
  const { t } = usePrefs();
  const qc = useQueryClient();
  const [f, setF] = useState({ name: item.name ?? "", category: item.category ?? "", quantity: item.quantity ?? 1, unit: item.unit ?? "", notes: item.notes ?? "", image_url: item.image_url ?? null });
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const row = { ...f, category: f.category || "-", unit: f.unit || "-" };
    const { error } = item.id
      ? await supabase.from("items").update(row).eq("id", item.id)
      : await supabase.from("items").insert({ ...row, created_by: (await supabase.auth.getUser()).data.user?.id ?? null });
    if (error) { toast.error(error.message); return; }
    toast.success(t("added"));
    qc.invalidateQueries({ queryKey: ["items"] });
    onClose();
  }
  async function remove() {
    const { error } = await supabase.from("items").delete().eq("id", item.id!);
    if (error) { toast.error(error.message); return; }
    toast.success(t("deleted")); qc.invalidateQueries({ queryKey: ["items"] }); onClose();
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("addItem")}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <ImagePicker value={f.image_url} onChange={(p) => setF({ ...f, image_url: p })} folder="items" />
          <div className="space-y-1"><Label>{t("name")}</Label><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><Label>{t("category")}</Label><Input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} /></div>
            <div className="space-y-1"><Label>{t("unit")}</Label><Input value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} /></div>
          </div>
          <div className="space-y-1"><Label>{t("quantity")}</Label><Input type="number" min={0} value={f.quantity} onChange={(e) => setF({ ...f, quantity: Number(e.target.value) })} /></div>
          <div className="space-y-1"><Label>{t("notes")}</Label><Input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">{t("save")}</Button>
            {item.id && <Button type="button" variant="destructive" onClick={remove}>{t("del")}</Button>}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RequestDialog({ item, onClose }: { item: Item; onClose: () => void }) {
  const { t } = usePrefs();
  const qc = useQueryClient();
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  async function send(e: React.FormEvent) {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("requests").insert({ item_id: item.id, quantity: qty, note: note || null, user_id: u.user!.id });
    if (error) { toast.error(error.message); return; }
    toast.success(t("requestSent"));
    qc.invalidateQueries({ queryKey: ["requests"] });
    onClose();
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("requestOf")} {item.name}</DialogTitle></DialogHeader>
        <form onSubmit={send} className="space-y-3">
          <div className="space-y-1"><Label>{t("quantity")} ({item.quantity} {t("available")})</Label><Input type="number" min={1} max={item.quantity} value={qty} onChange={(e) => setQty(Number(e.target.value))} /></div>
          <div className="space-y-1"><Label>{t("reason")}</Label><Input value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <Button type="submit" className="w-full">{t("sendRequest")}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

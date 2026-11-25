import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePrefs } from "@/lib/prefs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MediaImage, ImagePicker } from "./MediaImage";
import { nameMap } from "./names";

type P = { id?: string; name: string; description: string | null; price: number; stock: number; image_url: string | null };

export function ShopTab({ staff }: { staff: boolean }) {
  const { t, lang } = usePrefs();
  const qc = useQueryClient();
  const products = useQuery({ queryKey: ["products"], queryFn: async () => (await supabase.from("products").select("*").order("name")).data ?? [] });
  const orders = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data } = await supabase.from("shop_orders").select("*, products(name, price)").order("created_at", { ascending: false });
      const pm = await nameMap((data ?? []).map((o) => o.user_id));
      return (data ?? []).map((o) => ({ ...o, who: pm.get(o.user_id) ?? "" }));
    },
  });
  const [edit, setEdit] = useState<P | null>(null);
  const [buy, setBuy] = useState<{ id: string; name: string; price: number; max: number; qty: number } | null>(null);
  const dir = lang === "ar" ? "rtl" : "ltr";
  const refresh = () => { qc.invalidateQueries({ queryKey: ["products"] }); qc.invalidateQueries({ queryKey: ["orders"] }); };

  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!edit) return;
    const { id, ...row } = edit;
    const { error } = id ? await supabase.from("products").update(row).eq("id", id) : await supabase.from("products").insert(row);
    if (error) { toast.error(error.message); return; }
    toast.success(t("added")); setEdit(null); refresh();
  }
  async function del(id: string) {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(error.message); else toast.success(t("deleted")); refresh();
  }
  async function order(e: React.FormEvent) {
    e.preventDefault(); if (!buy) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("shop_orders").insert({ product_id: buy.id, quantity: buy.qty, user_id: u.user!.id });
    if (error) { toast.error(error.message); return; }
    toast.success(t("orderSent")); setBuy(null); refresh();
  }
  async function decide(id: string, complete: boolean) {
    const { error } = await supabase.rpc("decide_order", { _order_id: id, _complete: complete });
    if (error) { toast.error(error.message); return; }
    refresh();
  }
  const st = { pending: t("pending"), completed: t("completed"), cancelled: t("cancelled") } as Record<string, string>;

  return (
    <div className="mt-4 space-y-8">
      {staff && <Button className="gap-1" onClick={() => setEdit({ name: "", description: "", price: 0, stock: 1, image_url: null })}><Plus className="h-4 w-4" />{t("newProduct")}</Button>}
      {(products.data ?? []).length === 0 && <p className="py-6 text-center text-muted-foreground">{t("noItems")}</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(products.data ?? []).map((p) => (
          <div key={p.id} className="overflow-hidden rounded-xl border bg-card shadow-soft">
            <MediaImage path={p.image_url} alt={p.name} className="h-40 w-full" />
            <div className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-lg font-bold">{p.name}</h3>
                <span className="font-bold text-primary">{Number(p.price)} {t("currency")}</span>
              </div>
              {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
              <div className="flex items-center gap-2">
                <Badge variant={p.stock > 0 ? "secondary" : "destructive"}>{p.stock > 0 ? `${p.stock} ${t("stock")}` : t("soldOut")}</Badge>
                <div className="flex-1" />
                {staff && <Button size="sm" variant="ghost" onClick={() => setEdit({ id: p.id, name: p.name, description: p.description, price: Number(p.price), stock: p.stock, image_url: p.image_url })}>✎</Button>}
                {staff && <Button size="icon" variant="ghost" aria-label={t("del")} onClick={() => del(p.id)}><Trash2 className="h-4 w-4" /></Button>}
                {p.stock > 0 && <Button size="sm" onClick={() => setBuy({ id: p.id, name: p.name, price: Number(p.price), max: p.stock, qty: 1 })}>{t("buy")}</Button>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <section>
        <h2 className="mb-3 font-display text-xl font-bold">{staff ? t("orders") : t("myOrders")}</h2>
        {(orders.data ?? []).length === 0 ? <p className="text-muted-foreground">{t("noRequests")}</p> : (
          <div className="space-y-2">
            {(orders.data ?? []).map((o) => (
              <div key={o.id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
                <div className="flex-1">
                  <p className="font-bold">{o.products?.name} × {o.quantity} · {t("total")}: {Number(o.products?.price ?? 0) * o.quantity} {t("currency")}</p>
                  <p className="text-xs text-muted-foreground">{staff && `${o.who} · `}{new Date(o.created_at).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB")}</p>
                </div>
                <Badge variant={o.status === "cancelled" ? "destructive" : o.status === "completed" ? "default" : "outline"}>{st[o.status] ?? o.status}</Badge>
                {staff && o.status === "pending" && (
                  <div className="flex gap-1">
                    <Button size="sm" className="gap-1" onClick={() => decide(o.id, true)}><Check className="h-4 w-4" />{t("complete")}</Button>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => decide(o.id, false)}><X className="h-4 w-4" />{t("cancel")}</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent dir={dir}>
          <DialogHeader><DialogTitle>{t("newProduct")}</DialogTitle></DialogHeader>
          {edit && <form onSubmit={save} className="space-y-3">
            <ImagePicker value={edit.image_url} folder="products" onChange={(p) => setEdit({ ...edit, image_url: p })} />
            <div className="space-y-1"><Label>{t("name")}</Label><Input required value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
            <div className="space-y-1"><Label>{t("description")}</Label><Input value={edit.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label>{t("price")}</Label><Input type="number" min={0} step="0.5" value={edit.price} onChange={(e) => setEdit({ ...edit, price: Number(e.target.value) })} /></div>
              <div className="space-y-1"><Label>{t("stock")}</Label><Input type="number" min={0} value={edit.stock} onChange={(e) => setEdit({ ...edit, stock: Number(e.target.value) })} /></div>
            </div>
            <Button type="submit" className="w-full">{t("save")}</Button>
          </form>}
        </DialogContent>
      </Dialog>

      <Dialog open={!!buy} onOpenChange={(o) => !o && setBuy(null)}>
        <DialogContent dir={dir}>
          <DialogHeader><DialogTitle>{buy?.name}</DialogTitle></DialogHeader>
          {buy && <form onSubmit={order} className="space-y-3">
            <div className="space-y-1"><Label>{t("quantity")} ({buy.max} {t("stock")})</Label><Input type="number" min={1} max={buy.max} value={buy.qty} onChange={(e) => setBuy({ ...buy, qty: Number(e.target.value) })} /></div>
            <p className="font-bold">{t("total")}: {buy.qty * buy.price} {t("currency")}</p>
            <Button type="submit" className="w-full">{t("buy")}</Button>
          </form>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

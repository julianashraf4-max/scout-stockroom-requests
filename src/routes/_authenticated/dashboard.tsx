import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { LogOut, Plus, Tent, Check, X, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "لوحة المخزن — مخزن الكشافة" },
      { name: "description", content: "الأصناف والطلبات والأعضاء في مخزن الكشافة." },
      { property: "og:title", content: "لوحة المخزن" },
      { property: "og:description", content: "إدارة أصناف وطلبات مخزن الكشافة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

type Role = "admin" | "keeper" | "member";
const roleLabel: Record<Role, string> = { admin: "مسؤول", keeper: "أمين مخزن", member: "عضو" };
const statusLabel = { pending: "مستني", approved: "اتوافق", rejected: "مرفوض" } as const;

function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const id = u.user!.id;
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", id),
      ]);
      const roles = (r ?? []).map((x) => x.role as Role);
      const role: Role = roles.includes("admin") ? "admin" : roles.includes("keeper") ? "keeper" : "member";
      return { id, name: p?.full_name || u.user!.email || "", role };
    },
  });
}

function Dashboard() {
  const me = useMe();
  const nav = useNavigate();
  if (!me.data) return <div className="p-10 text-center text-muted-foreground">جاري التحميل…</div>;
  const { role, name } = me.data;
  const staff = role !== "member";
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-hero text-primary-foreground">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2"><Tent className="h-6 w-6" /><span className="font-display text-xl font-bold">مخزن الكشافة</span></div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm sm:inline">{name}</span>
            <Badge className="bg-accent text-accent-foreground">{roleLabel[role]}</Badge>
            <Button size="icon" variant="ghost" aria-label="خروج" onClick={async () => { await supabase.auth.signOut(); nav({ to: "/auth" }); }}><LogOut className="h-5 w-5" /></Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Tabs defaultValue="items" dir="rtl">
          <TabsList>
            <TabsTrigger value="items">المخزن</TabsTrigger>
            <TabsTrigger value="requests">{staff ? "الطلبات" : "طلباتي"}</TabsTrigger>
            {role === "admin" && <TabsTrigger value="users">الأفراد</TabsTrigger>}
          </TabsList>
          <TabsContent value="items"><Items staff={staff} /></TabsContent>
          <TabsContent value="requests"><Requests staff={staff} /></TabsContent>
          {role === "admin" && <TabsContent value="users"><UsersTab meId={me.data.id} /></TabsContent>}
        </Tabs>
      </main>
    </div>
  );
}

function Items({ staff }: { staff: boolean }) {
  const qc = useQueryClient();
  const items = useQuery({
    queryKey: ["items"],
    queryFn: async () => (await supabase.from("items").select("*").order("name")).data ?? [],
  });
  const [q, setQ] = useState("");
  const list = (items.data ?? []).filter((i) => i.name.includes(q) || i.category.includes(q));

  async function adjust(id: string, qty: number) {
    const { error } = await supabase.from("items").update({ quantity: Math.max(0, qty), updated_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["items"] });
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex gap-2">
        <Input placeholder="دوّر على صنف…" value={q} onChange={(e) => setQ(e.target.value)} />
        {staff && <ItemDialog />}
      </div>
      {list.length === 0 && <p className="py-10 text-center text-muted-foreground">مفيش أصناف لسه</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((i) => (
          <div key={i.id} className="rounded-xl border bg-card p-4 shadow-soft">
            <div className="flex items-start justify-between">
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
                  <Button size="icon" variant="outline" aria-label="زوّد" onClick={() => adjust(i.id, i.quantity + 1)}><Plus className="h-4 w-4" /></Button>
                  <Button size="icon" variant="outline" aria-label="قلّل" onClick={() => adjust(i.id, i.quantity - 1)}><Minus className="h-4 w-4" /></Button>
                </>
              )}
              <div className="flex-1" />
              {i.quantity > 0 && <RequestDialog itemId={i.id} itemName={i.name} max={i.quantity} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ItemDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", category: "عام", quantity: 1, unit: "قطعة", notes: "" });
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("items").insert({ ...f, created_by: u.user?.id ?? null });
    if (error) { toast.error(error.message); return; }
    toast.success("اتضاف للمخزن");
    setOpen(false);
    setF({ name: "", category: "عام", quantity: 1, unit: "قطعة", notes: "" });
    qc.invalidateQueries({ queryKey: ["items"] });
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="gap-1"><Plus className="h-4 w-4" />صنف جديد</Button></DialogTrigger>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>إضافة صنف</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="space-y-1"><Label>الاسم</Label><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><Label>التصنيف</Label><Input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} /></div>
            <div className="space-y-1"><Label>الوحدة</Label><Input value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} /></div>
          </div>
          <div className="space-y-1"><Label>الكمية</Label><Input type="number" min={0} value={f.quantity} onChange={(e) => setF({ ...f, quantity: Number(e.target.value) })} /></div>
          <div className="space-y-1"><Label>ملاحظات</Label><Input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
          <Button type="submit" className="w-full">حفظ</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RequestDialog({ itemId, itemName, max }: { itemId: string; itemName: string; max: number }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  async function send(e: React.FormEvent) {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("requests").insert({ item_id: itemId, quantity: qty, note: note || null, user_id: u.user!.id });
    if (error) { toast.error(error.message); return; }
    toast.success("الطلب اتبعت لأمين المخزن");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["requests"] });
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="secondary">اطلب</Button></DialogTrigger>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>طلب {itemName}</DialogTitle></DialogHeader>
        <form onSubmit={send} className="space-y-3">
          <div className="space-y-1"><Label>الكمية (المتاح {max})</Label><Input type="number" min={1} max={max} value={qty} onChange={(e) => setQty(Number(e.target.value))} /></div>
          <div className="space-y-1"><Label>السبب / الملاحظة</Label><Input value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <Button type="submit" className="w-full">ابعت الطلب</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Requests({ staff }: { staff: boolean }) {
  const qc = useQueryClient();
  const reqs = useQuery({
    queryKey: ["requests"],
    queryFn: async () => {
      const { data } = await supabase.from("requests").select("*, items(name, unit)").order("created_at", { ascending: false });
      const ids = [...new Set((data ?? []).map((r) => r.user_id))];
      const { data: profs } = ids.length ? await supabase.from("profiles").select("id, full_name, email").in("id", ids) : { data: [] };
      const pm = new Map((profs ?? []).map((p) => [p.id, p.full_name || p.email]));
      return (data ?? []).map((r) => ({ ...r, who: pm.get(r.user_id) ?? "" }));
    },
  });
  async function decide(id: string, approve: boolean) {
    const { error } = await supabase.rpc("decide_request", { _request_id: id, _approve: approve });
    if (error) { toast.error(error.message); return; }
    toast.success(approve ? "اتوافق على الطلب" : "اترفض الطلب");
    qc.invalidateQueries({ queryKey: ["requests"] });
    qc.invalidateQueries({ queryKey: ["items"] });
  }
  const list = reqs.data ?? [];
  if (!list.length) return <p className="py-10 text-center text-muted-foreground">مفيش طلبات</p>;
  return (
    <div className="mt-4 space-y-2">
      {list.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
          <div className="flex-1">
            <p className="font-bold">{r.items?.name} × {r.quantity} {r.items?.unit}</p>
            <p className="text-xs text-muted-foreground">{staff && `${r.who} · `}{new Date(r.created_at).toLocaleDateString("ar-EG")}{r.note && ` · ${r.note}`}</p>
          </div>
          <Badge variant={r.status === "rejected" ? "destructive" : r.status === "approved" ? "default" : "outline"}>{statusLabel[r.status as keyof typeof statusLabel]}</Badge>
          {staff && r.status === "pending" && (
            <div className="flex gap-1">
              <Button size="sm" className="gap-1" onClick={() => decide(r.id, true)}><Check className="h-4 w-4" />موافقة</Button>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => decide(r.id, false)}><X className="h-4 w-4" />رفض</Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function UsersTab({ meId }: { meId: string }) {
  const qc = useQueryClient();
  const users = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      return (p ?? []).map((u) => {
        const rs = (r ?? []).filter((x) => x.user_id === u.id).map((x) => x.role as Role);
        return { ...u, role: (rs.includes("admin") ? "admin" : rs.includes("keeper") ? "keeper" : "member") as Role };
      });
    },
  });
  async function setRole(userId: string, role: Role) {
    const del = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (del.error) { toast.error(del.error.message); return; }
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) { toast.error(error.message); return; }
    toast.success("الدور اتغير");
    qc.invalidateQueries({ queryKey: ["users"] });
  }
  return (
    <div className="mt-4 space-y-2">
      {(users.data ?? []).map((u) => (
        <div key={u.id} className="flex items-center gap-3 rounded-xl border bg-card p-4">
          <div className="flex-1">
            <p className="font-bold">{u.full_name || "بدون اسم"}</p>
            <p className="text-xs text-muted-foreground" dir="ltr">{u.email}</p>
          </div>
          <Select value={u.role} disabled={u.id === meId} onValueChange={(v) => setRole(u.id, v as Role)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(roleLabel) as Role[]).map((k) => <SelectItem key={k} value={k}>{roleLabel[k]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}

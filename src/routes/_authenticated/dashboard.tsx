import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePrefs } from "@/lib/prefs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/store/Logo";
import { PrefsToggles } from "@/components/store/PrefsToggles";
import { ItemsTab } from "@/components/store/ItemsTab";
import { RequestsTab } from "@/components/store/RequestsTab";
import { UsersTab } from "@/components/store/UsersTab";
import { LeadersTab } from "@/components/store/LeadersTab";
import { ShopTab } from "@/components/store/ShopTab";
import { SettingsTab } from "@/components/store/SettingsTab";
import { roleKey, topRole } from "@/components/store/roles";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "لوحة المخزن — مخزن الكشافة" },
      { name: "description", content: "الأصناف والطلبات والقادة والمتجر في مخزن الكشافة." },
      { property: "og:title", content: "لوحة المخزن" },
      { property: "og:description", content: "إدارة أصناف وطلبات ومتجر مخزن الكشافة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

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
      return { id, name: p?.full_name || u.user!.email || "", role: topRole((r ?? []).map((x) => x.role)) };
    },
  });
}

function Dashboard() {
  const me = useMe();
  const nav = useNavigate();
  const { t, lang } = usePrefs();
  if (!me.data) return <div className="p-10 text-center text-muted-foreground">{t("loading")}</div>;
  const { role, name } = me.data;
  const staff = role !== "member";
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-hero text-primary-foreground">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-2"><Logo className="h-8 w-8" /><span className="font-display text-xl font-bold">{t("appName")}</span></div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm sm:inline">{name}</span>
            <Badge className="bg-accent text-accent-foreground">{t(roleKey[role])}</Badge>
            <PrefsToggles />
            <Button size="icon" variant="ghost" aria-label={t("logout")} onClick={async () => { await supabase.auth.signOut(); nav({ to: "/auth" }); }}><LogOut className="h-5 w-5" /></Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Tabs defaultValue="items" dir={lang === "ar" ? "rtl" : "ltr"}>
          <TabsList className="flex h-auto flex-wrap">
            <TabsTrigger value="items">{t("tabStore")}</TabsTrigger>
            <TabsTrigger value="requests">{staff ? t("tabRequests") : t("tabMyRequests")}</TabsTrigger>
            <TabsTrigger value="leaders">{t("tabLeaders")}</TabsTrigger>
            <TabsTrigger value="shop">{t("tabShop")}</TabsTrigger>
            {role === "admin" && <TabsTrigger value="users">{t("tabUsers")}</TabsTrigger>}
            {staff && <TabsTrigger value="settings">{t("tabSettings")}</TabsTrigger>}
          </TabsList>
          <TabsContent value="items"><ItemsTab staff={staff} /></TabsContent>
          <TabsContent value="requests"><RequestsTab staff={staff} /></TabsContent>
          <TabsContent value="leaders"><LeadersTab staff={staff} /></TabsContent>
          <TabsContent value="shop"><ShopTab staff={staff} /></TabsContent>
          {role === "admin" && <TabsContent value="users"><UsersTab meId={me.data.id} /></TabsContent>}
          {staff && <TabsContent value="settings"><SettingsTab /></TabsContent>}
        </Tabs>
      </main>
    </div>
  );
}

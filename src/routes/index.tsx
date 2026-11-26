import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package, PackageCheck, ShieldCheck, ShoppingBag, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePrefs } from "@/lib/prefs";
import { Logo } from "@/components/store/Logo";
import { PrefsToggles } from "@/components/store/PrefsToggles";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "مخزن الكشافة — إدارة العهدة والطلبات" },
      { name: "description", content: "نظام بسيط لإدارة مخزن الكشافة: أصناف، طلبات استلام، وموافقات." },
      { property: "og:title", content: "مخزن الكشافة" },
      { property: "og:description", content: "إدارة مخزن الكشافة والطلبات والموافقات في مكان واحد." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { t } = usePrefs();
  const counts = useQuery({
    queryKey: ["public-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_counts");
      if (error) throw error;
      return data[0] ?? { items_count: 0, products_count: 0 };
    },
  });
  const features = [
    { icon: ShieldCheck, t: t("roleAdmin"), d: t("roleAdminD") },
    { icon: PackageCheck, t: t("roleKeeper"), d: t("roleKeeperD") },
    { icon: Users, t: t("roleMember"), d: t("roleMemberD") },
  ];
  return (
    <main className="min-h-screen bg-hero text-primary-foreground">
      <div className="flex justify-end p-3"><PrefsToggles /></div>
      <div className="mx-auto flex max-w-4xl flex-col items-center px-6 py-10 text-center">
        <div className="mb-6 rounded-full bg-accent p-4 text-accent-foreground shadow-soft">
          <Logo className="h-12 w-12" />
        </div>
        <h1 className="font-display text-5xl font-bold md:text-6xl">{t("appName")}</h1>
        <p className="mt-4 max-w-md text-lg opacity-90">{t("tagline")}</p>
        <Button asChild size="lg" className="mt-8 bg-accent text-accent-foreground hover:bg-accent/90">
          <Link to="/dashboard">{t("enter")}</Link>
        </Button>
        <div className="mt-10 grid w-full gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-card p-6 text-card-foreground shadow-soft">
            <Package className="mx-auto mb-2 h-8 w-8 text-primary" />
            <p className="font-display text-4xl font-bold">{counts.data ? counts.data.items_count : "—"}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("homeStoreCount")}</p>
          </div>
          <div className="rounded-2xl bg-card p-6 text-card-foreground shadow-soft">
            <ShoppingBag className="mx-auto mb-2 h-8 w-8 text-primary" />
            <p className="font-display text-4xl font-bold">{counts.data ? counts.data.products_count : "—"}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("homeShopCount")}</p>
          </div>
        </div>
        <div className="mt-10 grid w-full gap-4 md:grid-cols-3">
          {features.map((f) => (
            <div key={f.t} className="rounded-xl bg-card p-6 text-card-foreground shadow-soft">
              <f.icon className="mx-auto mb-3 h-7 w-7 text-primary" />
              <h3 className="font-display text-xl font-bold">{f.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

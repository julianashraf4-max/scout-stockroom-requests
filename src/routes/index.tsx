import { createFileRoute, Link } from "@tanstack/react-router";
import { Tent, PackageCheck, ShieldCheck, Users } from "lucide-react";
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
  const features = [
    { icon: ShieldCheck, t: "المسؤول", d: "يتحكم في كل حاجة ويحدد أدوار الأفراد" },
    { icon: PackageCheck, t: "أمين المخزن", d: "يضيف الأصناف ويوافق على الطلبات" },
    { icon: Users, t: "العضو", d: "يشوف المتاح ويطلب اللي محتاجه" },
  ];
  return (
    <main className="min-h-screen bg-hero text-primary-foreground">
      <div className="mx-auto flex max-w-4xl flex-col items-center px-6 py-20 text-center">
        <div className="mb-6 rounded-full bg-accent p-4 text-accent-foreground shadow-soft">
          <Tent className="h-10 w-10" />
        </div>
        <h1 className="font-display text-5xl font-bold md:text-6xl">مخزن الكشافة</h1>
        <p className="mt-4 max-w-md text-lg opacity-90">كل عهدة المخزن في مكان واحد — مين أخد إيه، وإيه المتاح.</p>
        <Button asChild size="lg" className="mt-8 bg-accent text-accent-foreground hover:bg-accent/90">
          <Link to="/dashboard">ادخل المخزن</Link>
        </Button>
        <div className="mt-16 grid w-full gap-4 md:grid-cols-3">
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

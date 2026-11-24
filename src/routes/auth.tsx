import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { usePrefs } from "@/lib/prefs";
import { Logo } from "@/components/store/Logo";
import { PrefsToggles } from "@/components/store/PrefsToggles";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — مخزن الكشافة" },
      { name: "description", content: "سجّل دخولك أو اعمل حساب جديد في مخزن الكشافة." },
      { property: "og:title", content: "تسجيل الدخول — مخزن الكشافة" },
      { property: "og:description", content: "ادخل على حسابك في مخزن الكشافة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const { t } = usePrefs();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(t("badLogin"));
      else nav({ to: "/dashboard" });
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + "/dashboard", data: { full_name: name } },
      });
      if (error) toast.error(error.message);
      else toast.success(t("checkEmail"));
    }
    setBusy(false);
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) { toast.error(t("googleFail")); return; }
    if (r.redirected) return;
    nav({ to: "/dashboard" });
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-hero px-4">
      <div className="absolute top-3 end-3 text-primary-foreground"><PrefsToggles /></div>
      <div className="w-full max-w-sm rounded-2xl bg-card p-8 shadow-soft">
        <div className="mb-6 text-center">
          <Logo className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-2 font-display text-3xl font-bold">{mode === "in" ? t("signIn") : t("signUp")}</h1>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {mode === "up" && (
            <div className="space-y-1"><Label>{t("name")}</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
          )}
          <div className="space-y-1"><Label>{t("email")}</Label><Input type="email" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="space-y-1"><Label>{t("password")}</Label><Input type="password" dir="ltr" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <Button type="submit" className="w-full" disabled={busy}>{mode === "in" ? t("doSignIn") : t("doSignUp")}</Button>
        </form>
        <Button type="button" variant="outline" className="mt-3 w-full gap-2" onClick={google}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
          {t("google")}
        </Button>
        <button type="button" className="mt-4 w-full text-sm text-primary underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? t("toSignUp") : t("toSignIn")}
        </button>
      </div>
    </main>
  );
}

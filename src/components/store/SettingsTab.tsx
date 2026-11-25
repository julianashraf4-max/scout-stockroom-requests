import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePrefs } from "@/lib/prefs";
import { ImagePicker } from "./MediaImage";
import { useSettings } from "./Logo";

export function SettingsTab() {
  const { t } = usePrefs();
  const qc = useQueryClient();
  const s = useSettings();
  async function setLogo(p: string | null) {
    const { error } = await supabase.from("site_settings").upsert({ id: 1, logo_url: p, updated_at: new Date().toISOString() });
    if (error) { toast.error(error.message); return; }
    toast.success(t("logoSaved"));
    qc.invalidateQueries({ queryKey: ["settings"] });
  }
  return (
    <div className="mt-4 rounded-xl border bg-card p-6">
      <h2 className="mb-4 font-display text-xl font-bold">{t("logo")}</h2>
      <ImagePicker value={s.data?.logo_url ?? null} folder="logo" onChange={setLogo} />
    </div>
  );
}

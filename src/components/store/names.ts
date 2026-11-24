import { supabase } from "@/integrations/supabase/client";
export async function nameMap(ids: string[]) {
  const uniq = [...new Set(ids)];
  if (!uniq.length) return new Map<string, string>();
  const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", uniq);
  return new Map((data ?? []).map((p) => [p.id, p.full_name || p.email || ""]));
}

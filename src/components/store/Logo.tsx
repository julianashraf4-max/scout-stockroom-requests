import { useQuery } from "@tanstack/react-query";
import { Tent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle()).data,
  });
}

export function Logo({ className }: { className?: string }) {
  const s = useSettings();
  const url = useMediaUrl(s.data?.logo_url);
  if (url) return <img src={url} alt="logo" className={cn("rounded-full object-cover", className)} />;
  return <Tent className={className} />;
}

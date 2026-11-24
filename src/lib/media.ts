import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export async function uploadImage(file: File, folder: string) {
  const ext = file.name.split(".").pop() || "png";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

export function useMediaUrl(path: string | null | undefined) {
  const q = useQuery({
    queryKey: ["media", path],
    enabled: !!path,
    staleTime: 1000 * 60 * 50,
    queryFn: async () => {
      const { data } = await supabase.storage.from("media").createSignedUrl(path!, 60 * 60 * 24);
      return data?.signedUrl ?? null;
    },
  });
  return q.data ?? null;
}

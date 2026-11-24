import { ImageIcon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useMediaUrl, uploadImage } from "@/lib/media";
import { usePrefs } from "@/lib/prefs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MediaImage({ path, alt, className }: { path: string | null | undefined; alt: string; className?: string }) {
  const url = useMediaUrl(path);
  if (!url) return <div className={cn("flex items-center justify-center bg-muted text-muted-foreground", className)}><ImageIcon className="h-6 w-6" /></div>;
  return <img src={url} alt={alt} className={cn("object-cover", className)} />;
}

export function ImagePicker({ value, onChange, folder }: { value: string | null; onChange: (p: string | null) => void; folder: string }) {
  const { t } = usePrefs();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-3">
      <MediaImage path={value} alt="" className="h-16 w-16 rounded-lg" />
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setBusy(true);
        try { onChange(await uploadImage(f, folder)); } catch (err) { toast.error((err as Error).message); }
        setBusy(false);
      }} />
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => ref.current?.click()}>
        {busy ? t("uploading") : t("uploadImage")}
      </Button>
    </div>
  );
}

import { Moon, Sun, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrefs } from "@/lib/prefs";

export function PrefsToggles() {
  const { theme, setTheme, lang, setLang, t } = usePrefs();
  return (
    <div className="flex items-center gap-1">
      <Button size="icon" variant="ghost" aria-label={theme === "dark" ? t("light") : t("dark")} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
        {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </Button>
      <Button size="sm" variant="ghost" className="gap-1" onClick={() => setLang(lang === "ar" ? "en" : "ar")}>
        <Languages className="h-4 w-4" />{t("language")}
      </Button>
    </div>
  );
}

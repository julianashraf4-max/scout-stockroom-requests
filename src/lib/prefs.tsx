import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { dict, type Lang, type Key } from "./i18n";

type Theme = "light" | "dark";
type Ctx = { lang: Lang; setLang: (l: Lang) => void; theme: Theme; setTheme: (t: Theme) => void; t: (k: Key) => string };
const PrefsCtx = createContext<Ctx | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("ar");
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    const l = localStorage.getItem("lang");
    const th = localStorage.getItem("theme");
    if (l === "ar" || l === "en") setLang(l);
    if (th === "light" || th === "dark") setTheme(th);
  }, []);
  useEffect(() => {
    localStorage.setItem("lang", lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);
  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  const t = (k: Key) => dict[lang][k];
  return <PrefsCtx.Provider value={{ lang, setLang, theme, setTheme, t }}>{children}</PrefsCtx.Provider>;
}

export function usePrefs() {
  const c = useContext(PrefsCtx);
  if (!c) throw new Error("PrefsProvider missing");
  return c;
}

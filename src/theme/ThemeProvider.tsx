import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

type ThemeTokens = Record<string, string>;
type ActiveTheme = { slug: string; name: string; tokens: ThemeTokens } | null;

interface ThemeContextValue {
  active: ActiveTheme;
  loading: boolean;
  refresh: () => Promise<void>;
  previewTokens: (tokens: ThemeTokens | null) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  active: null,
  loading: true,
  refresh: async () => {},
  previewTokens: () => {},
});

const STYLE_ID = "app-theme-vars";
const THEME_CLASSES = ["theme-default", "theme-red-3d", "theme-aliexpress"];

function applyTokens(tokens: ThemeTokens) {
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  const body = Object.entries(tokens)
    .map(([k, v]) => `${k}: ${v};`)
    .join("\n  ");
  style.innerHTML = `:root {\n  ${body}\n}`;
}

function applyBodyClass(slug: string) {
  if (typeof document === "undefined") return;
  document.body.classList.remove(...THEME_CLASSES);
  const cls = `theme-${slug}`;
  document.body.classList.add(cls);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveTheme>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data, error } = await supabase.rpc("get_active_theme");
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (row?.tokens) {
        const t = { slug: row.slug, name: row.name, tokens: row.tokens as ThemeTokens };
        setActive(t);
        applyTokens(t.tokens);
      }
    } catch (e) {
      console.warn("[theme] failed to load active theme", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("active_theme_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "active_theme" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const previewTokens = (tokens: ThemeTokens | null) => {
    if (tokens) applyTokens(tokens);
    else if (active) applyTokens(active.tokens);
  };

  return (
    <ThemeContext.Provider value={{ active, loading, refresh: load, previewTokens }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

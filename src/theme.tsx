import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Theme = "dark" | "light";

export interface DiagramPalette {
  bg: string;
  phaseA: string;
  phaseB: string;
  dpBar: string;
  title: string;
  purpose: string;
  phase: string;
  label: string;
  labelBg: string;
  dep: string;
  plus: string;
  plusHover: string;
  plusInk: string;
  pill: string;
}

const THEME_KEY = "opsdesign:theme";

export const DIAGRAM_PALETTES: Record<Theme, DiagramPalette> = {
  light: {
    bg: "#ffffff",
    phaseA: "#f6f3ee",
    phaseB: "#efeae3",
    dpBar: "#e6e1d8",
    title: "#1a1f2b",
    purpose: "#6b7380",
    phase: "#2c3544",
    label: "#2c3544",
    labelBg: "rgba(255,255,255,0.92)",
    dep: "#7a8494",
    plus: "#1a1f2b",
    plusHover: "#2a3348",
    plusInk: "#f3f6f9",
    pill: "#1a1f2b",
  },
  dark: {
    bg: "#121a26",
    phaseA: "#182232",
    phaseB: "#141d2b",
    dpBar: "#1c2838",
    title: "#eef3f8",
    purpose: "#9aa8b8",
    phase: "#c5d0dc",
    label: "#e8eef4",
    labelBg: "rgba(10, 16, 26, 0.88)",
    dep: "#8b97a8",
    plus: "#c9ae6a",
    plusHover: "#d4bc7e",
    plusInk: "#0c121c",
    pill: "#0c121c",
  },
};

/** Word/A4 pages and paper figures — not the live editor theme. */
export const PAPER_PALETTE: DiagramPalette = DIAGRAM_PALETTES.light;

/** Swap baked-in diagram colours so a dark editor can still print on paper. */
export function recolorDiagramMarkup(
  markup: string,
  from: DiagramPalette,
  to: DiagramPalette,
): string {
  if (from === to) return markup;
  const pairs = (Object.keys(from) as Array<keyof DiagramPalette>)
    .map((key) => [from[key], to[key]] as const)
    .filter(([a, b]) => a !== b)
    .sort((a, b) => b[0].length - a[0].length);
  let out = markup;
  for (const [a, b] of pairs) {
    out = out.split(a).join(b);
  }
  return out;
}

export function loadTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* ignore */
  }
  return "dark";
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

export function persistTheme(theme: Theme): void {
  applyTheme(theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore */
  }
}

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  diagram: DiagramPalette;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => loadTheme());

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    persistTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next = current === "dark" ? "light" : "dark";
      persistTheme(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      diagram: DIAGRAM_PALETTES[theme],
    }),
    [theme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

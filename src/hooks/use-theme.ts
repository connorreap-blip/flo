import { useEffect } from "react";

const THEME_KEY = "flo-theme";

export type Theme = "dark" | "light";

export function getInitialTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
}

export function useThemeInit() {
  useEffect(() => {
    applyTheme(getInitialTheme());
  }, []);
}

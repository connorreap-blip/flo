import { useEffect, useRef } from "react";
import { useProjectStore } from "../store/project-store";

const THEME_KEY = "flo-theme";

export type Theme = "dark" | "light";

export function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "dark";
  }

  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.classList.toggle("dark", theme === "dark");
  window.localStorage.setItem(THEME_KEY, theme);
}

export function useThemeInit() {
  const theme = useProjectStore((state) => state.theme);
  const setTheme = useProjectStore((state) => state.setTheme);
  const initialized = useRef(false);

  useEffect(() => {
    const initialTheme = getInitialTheme();
    setTheme(initialTheme);
    applyTheme(initialTheme);
    initialized.current = true;
  }, [setTheme]);

  useEffect(() => {
    if (!initialized.current) {
      return;
    }

    applyTheme(theme);
  }, [theme]);
}

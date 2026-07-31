import { createContext, useContext } from "react";

export const ThemeContext = createContext(null);

export function getInitialTheme() {
  try {
    return (
      localStorage.getItem("cc_theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    );
  } catch {
    return "light";
  }
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}

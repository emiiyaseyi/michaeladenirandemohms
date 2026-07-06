"use client"
import { createContext, useContext, useEffect, useState } from "react"

type Theme = "light" | "dark"
const ThemeCtx = createContext<{ theme: Theme; setTheme: (t: Theme) => void; toggle: () => void }>({
  theme: "light", setTheme: () => {}, toggle: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Start with system preference; once mounted, read stored preference
  const [theme, setThemeState] = useState<Theme>("light")

  useEffect(() => {
    const stored = localStorage.getItem("mdh-theme") as Theme | null
    if (stored === "light" || stored === "dark") {
      setThemeState(stored)
    } else {
      // No stored preference - use system
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      setThemeState(prefersDark ? "dark" : "light")
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    document.documentElement.classList.add("theme-transition")
  }, [theme])

  const setTheme = (t: Theme) => {
    localStorage.setItem("mdh-theme", t)
    setThemeState(t)
  }

  const toggle = () => setTheme(theme === "light" ? "dark" : "light")

  return <ThemeCtx.Provider value={{ theme, setTheme, toggle }}>{children}</ThemeCtx.Provider>
}

export const useTheme = () => useContext(ThemeCtx)

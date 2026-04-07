"use client"
import { createContext, useContext, useEffect, useState } from "react"

type Theme = "light" | "dark" | "system"
const ThemeCtx = createContext<{ theme: Theme; setTheme: (t: Theme) => void; resolved: "light" | "dark" }>({
  theme: "system", setTheme: () => {}, resolved: "light",
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system")
  const [resolved, setResolved] = useState<"light" | "dark">("light")

  useEffect(() => {
    const stored = (localStorage.getItem("dsn-theme") as Theme) ?? "light"
    setThemeState(stored)
  }, [])

  useEffect(() => {
    const applyTheme = (t: Theme) => {
      const mq = window.matchMedia("(prefers-color-scheme: dark)")
      const isDark = t === "dark" || (t === "system" && mq.matches)
      document.documentElement.classList.toggle("dark", isDark)
      document.documentElement.classList.add("theme-transition")
      setResolved(isDark ? "dark" : "light")
    }
    applyTheme(theme)
    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)")
      const handler = () => applyTheme("system")
      mq.addEventListener("change", handler)
      return () => mq.removeEventListener("change", handler)
    }
  }, [theme])

  const setTheme = (t: Theme) => {
    localStorage.setItem("dsn-theme", t)
    setThemeState(t)
  }

  return <ThemeCtx.Provider value={{ theme, setTheme, resolved }}>{children}</ThemeCtx.Provider>
}

export const useTheme = () => useContext(ThemeCtx)

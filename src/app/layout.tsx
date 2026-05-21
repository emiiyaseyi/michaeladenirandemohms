import type { Metadata, Viewport } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/ThemeProvider"
import Providers from "@/components/Providers"

export const metadata: Metadata = {
  title: "DSN HRMS | Data Science Nigeria",
  description: "Unified HR Management System for Data Science Nigeria",
}

// Viewport — explicit width-device-width keeps content responsive.
// We deliberately omit `maximumScale`/`userScalable=no` because they break
// accessibility (pinch-to-zoom). The iOS focus-zoom on inputs is handled in
// globals.css by forcing input font-size ≥ 16px on touch devices.
// `viewportFit: "cover"` lets pages extend into the iPhone notch / home-bar
// safe-area; pages that need to respect the safe area use `env(safe-area-inset-*)`.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0B5C2E",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            var t = localStorage.getItem('dsn-theme');
            var dark = t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches);
            if (dark) document.documentElement.classList.add('dark');
          })();
        ` }} />
      </head>
      <body suppressHydrationWarning>
        <Providers><ThemeProvider>{children}</ThemeProvider></Providers>
      </body>
    </html>
  )
}

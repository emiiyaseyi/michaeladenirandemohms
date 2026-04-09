import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/ThemeProvider"
import Providers from "@/components/Providers"

export const metadata: Metadata = {
  title: "DSN HRMS | Data Science Nigeria",
  description: "Unified HR Management System for Data Science Nigeria",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            var t = localStorage.getItem('dsn-theme') || 'light';
            var dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
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

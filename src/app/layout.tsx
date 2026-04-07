import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "DSN HRMS | Data Science Nigeria",
  description: "Unified HR Management System for Data Science Nigeria",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

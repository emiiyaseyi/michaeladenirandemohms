"use client"

import { Bell, Search } from "lucide-react"

export function Header() {
  return (
    <header
      className="h-16 flex items-center justify-between px-6 flex-shrink-0"
      style={{
        background: "var(--card)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* Search */}
      <div className="relative flex items-center">
        <Search
          size={16}
          className="absolute left-3"
          style={{ color: "var(--muted-foreground)" }}
        />
        <input
          type="search"
          placeholder="Search employees, departments..."
          className="pl-9 pr-4 py-2 rounded-lg border text-sm w-72 outline-none"
          style={{
            background: "var(--background)",
            borderColor: "var(--border)",
            color: "var(--foreground)",
          }}
        />
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        <button
          className="relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
          style={{ background: "var(--background)", color: "var(--muted-foreground)" }}
        >
          <Bell size={18} />
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
            style={{ background: "var(--accent)" }}
          />
        </button>

        {/* User Avatar */}
        <button className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-lg transition-colors">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white"
            style={{ background: "var(--primary)" }}
          >
            AD
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-medium leading-tight" style={{ color: "var(--foreground)" }}>
              Admin
            </p>
            <p className="text-xs leading-tight" style={{ color: "var(--muted-foreground)" }}>
              HR Manager
            </p>
          </div>
        </button>
      </div>
    </header>
  )
}

"use client"
import { useState, useEffect } from "react"

type Branding = {
  companyName: string
  logoUrl: string | null
  primaryColor: string
}

const DEFAULTS: Branding = { companyName: "Michael Demo HRMS", logoUrl: null, primaryColor: "#0B5C2E" }

export function useBranding(): Branding {
  const [branding, setBranding] = useState<Branding>(DEFAULTS)

  useEffect(() => {
    fetch("/api/branding")
      .then(r => r.json())
      .then(d => setBranding(b => ({ ...b, ...d })))
      .catch(() => {})
  }, [])

  return branding
}

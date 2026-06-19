"use client"
import { useRef, useState, useCallback } from "react"

export function useDropdownPosition<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })

  const recompute = useCallback(() => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left, width: r.width })
    }
  }, [])

  return { ref, pos, recompute }
}

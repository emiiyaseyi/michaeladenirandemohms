"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function SSProfilePage() {
  const router = useRouter()
  useEffect(() => { router.replace("/self-service/edit") }, [router])
  return null
}

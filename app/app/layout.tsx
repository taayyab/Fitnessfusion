import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Fitness Fusion - Admin Dashboard",
  description: "Fitness Fusion gym management admin panel",
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

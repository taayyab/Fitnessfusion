import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Login - Fitness Fusion Admin",
  description: "Sign in to the Fitness Fusion admin dashboard",
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

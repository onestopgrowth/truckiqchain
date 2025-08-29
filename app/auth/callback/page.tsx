"use client"

import { createSupabaseClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      const supabase = createSupabaseClient()

      try {
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error("Auth callback error:", error)
          router.push("/auth/login?error=confirmation_failed")
          return
        }

        if (data.session) {
          // User is confirmed and logged in, redirect to dashboard
          router.push("/dashboard")
        } else {
          // No session, redirect to login
          router.push("/auth/login")
        }
      } catch (error) {
        console.error("Callback handling error:", error)
        router.push("/auth/login?error=callback_error")
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Confirming your account...</h2>
        <p className="text-muted-foreground">Please wait while we verify your email.</p>
      </div>
    </div>
  )
}

import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { CapacityCallForm } from "@/components/capacity-call-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default async function PostCapacityCallPage() {
  const supabase = await createServerClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get user profile to ensure they're a capacity finder
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single()

  if (profile?.role !== "capacity_finder") {
    redirect("/dashboard")
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Post Capacity Call</h1>
          <p className="text-muted-foreground">Create a new load posting to find qualified carriers</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>

      <div className="max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Load Details</CardTitle>
            <CardDescription>Fill out the load information to attract the right carriers</CardDescription>
          </CardHeader>
          <CardContent>
            <CapacityCallForm />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

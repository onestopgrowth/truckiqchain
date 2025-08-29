import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { CarrierProfileForm } from "@/components/carrier-profile-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default async function CarrierProfilePage() {
  const supabase = await createServerClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get user profile to ensure they're a carrier
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single()

  if (profile?.role !== "carrier") {
    redirect("/dashboard")
  }

  // Get existing carrier profile if it exists
  const { data: carrierProfile } = await supabase
    .from("carrier_profiles")
    .select("*")
    .eq("user_id", data.user.id)
    .single()

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Carrier Profile</h1>
          <p className="text-muted-foreground">
            {carrierProfile
              ? "Update your carrier information"
              : "Create your carrier profile to start receiving loads"}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>

      <div className="max-w-2xl">
        {carrierProfile ? (
          <CarrierProfileForm initialData={carrierProfile} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Create Your Carrier Profile</CardTitle>
              <CardDescription>Fill out your carrier information to start matching with capacity calls</CardDescription>
            </CardHeader>
            <CardContent>
              <CarrierProfileForm />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

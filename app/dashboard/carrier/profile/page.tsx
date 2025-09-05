import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { CarrierProfileForm } from "@/components/carrier-profile-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

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
      <div className="flex items-start justify-between mb-8 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Carrier Profile</h1>
            {carrierProfile?.availability_status === "available" && (
              <Badge variant="secondary" className="bg-green-500 text-white hover:bg-green-500">
                Available
              </Badge>
            )}
            {carrierProfile?.availability_status === "busy" && (
              <Badge variant="secondary" className="bg-amber-500 text-white hover:bg-amber-500">
                Busy
              </Badge>
            )}
            {carrierProfile?.availability_status === "unavailable" && (
              <Badge variant="secondary" className="bg-gray-400 text-white hover:bg-gray-400">
                Unavailable
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {carrierProfile
              ? "Update your carrier information"
              : "Create your carrier profile to start receiving loads"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>

      <div className="w-full">
        {carrierProfile ? (
          <div className="w-full">
            <CarrierProfileForm initialData={carrierProfile} />
          </div>
        ) : (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Create Your Carrier Profile</CardTitle>
              <CardDescription>
                Fill out your carrier information to start matching with capacity calls
              </CardDescription>
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

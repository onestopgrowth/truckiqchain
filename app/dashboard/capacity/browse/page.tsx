import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export default async function BrowseCapacityCallsPage() {
  const supabase = await createServerClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get user profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single()

  // Get all open capacity calls
  const { data: capacityCalls } = await supabase
    .from("capacity_calls")
    .select(`
      *,
      profiles!capacity_calls_user_id_fkey (
        company_name,
        email
      )
    `)
    .eq("status", "open")
    .order("created_at", { ascending: false })

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Browse Capacity Calls</h1>
          <p className="text-muted-foreground">Find loads that match your equipment and experience</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>

      {!capacityCalls || capacityCalls.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">No Capacity Calls Available</h3>
            <p className="text-muted-foreground">Check back later for new load opportunities.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {capacityCalls.map((call) => (
            <Card key={call.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{call.title}</CardTitle>
                    <CardDescription>Posted by {call.profiles?.company_name || call.profiles?.email}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{call.equipment_needed.replace("_", " ")}</Badge>
                    <Badge variant="outline">Min XP: {call.minimum_xp_score}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground mb-1">ORIGIN</h4>
                    <p className="text-sm">
                      {call.origin_city}, {call.origin_state}
                      {call.origin_zip && ` ${call.origin_zip}`}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground mb-1">DESTINATION</h4>
                    <p className="text-sm">
                      {call.destination_city}, {call.destination_state}
                      {call.destination_zip && ` ${call.destination_zip}`}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground mb-1">PICKUP</h4>
                    <p className="text-sm">
                      {call.pickup_date ? new Date(call.pickup_date).toLocaleDateString() : "TBD"}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground mb-1">DELIVERY</h4>
                    <p className="text-sm">
                      {call.delivery_date ? new Date(call.delivery_date).toLocaleDateString() : "TBD"}
                    </p>
                  </div>
                </div>

                {call.description && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-sm text-muted-foreground mb-1">DESCRIPTION</h4>
                    <p className="text-sm">{call.description}</p>
                  </div>
                )}

                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                  <div className="flex gap-4 text-sm">
                    {call.weight && <span>Weight: {call.weight.toLocaleString()} lbs</span>}
                    {call.total_rate && (
                      <span className="font-semibold">Rate: ${call.total_rate.toLocaleString()}</span>
                    )}
                    {call.rate_per_mile && <span>Per Mile: ${call.rate_per_mile}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Posted {new Date(call.created_at).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

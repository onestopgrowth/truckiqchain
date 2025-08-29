import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export default async function ManageCapacityCallsPage() {
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

  // Get user's capacity calls
  const { data: capacityCalls } = await supabase
    .from("capacity_calls")
    .select("*")
    .eq("user_id", data.user.id)
    .order("created_at", { ascending: false })

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Manage Capacity Calls</h1>
          <p className="text-muted-foreground">View and manage your posted loads</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/dashboard/capacity/post">Post New Load</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>

      {!capacityCalls || capacityCalls.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">No Capacity Calls Posted</h3>
            <p className="text-muted-foreground mb-4">Start by posting your first load to find carriers.</p>
            <Button asChild>
              <Link href="/dashboard/capacity/post">Post Your First Load</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {capacityCalls.map((call) => (
            <Card key={call.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{call.title}</CardTitle>
                    <CardDescription>
                      {call.origin_city}, {call.origin_state} → {call.destination_city}, {call.destination_state}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge
                      variant={
                        call.status === "open"
                          ? "default"
                          : call.status === "assigned"
                            ? "secondary"
                            : call.status === "completed"
                              ? "outline"
                              : "destructive"
                      }
                    >
                      {call.status.toUpperCase()}
                    </Badge>
                    <Badge variant="outline">{call.equipment_needed.replace("_", " ")}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground mb-1">REQUIREMENTS</h4>
                    <p className="text-sm">Min XP Score: {call.minimum_xp_score}</p>
                    {call.weight && <p className="text-sm">Weight: {call.weight.toLocaleString()} lbs</p>}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground mb-1">TIMING</h4>
                    <p className="text-sm">
                      Pickup: {call.pickup_date ? new Date(call.pickup_date).toLocaleDateString() : "TBD"}
                    </p>
                    <p className="text-sm">
                      Delivery: {call.delivery_date ? new Date(call.delivery_date).toLocaleDateString() : "TBD"}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground mb-1">RATE</h4>
                    {call.total_rate && <p className="text-sm font-semibold">${call.total_rate.toLocaleString()}</p>}
                    {call.rate_per_mile && <p className="text-sm">${call.rate_per_mile}/mile</p>}
                  </div>
                </div>

                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                  <div className="text-xs text-muted-foreground">
                    Posted {new Date(call.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex gap-2">
                    {call.status === "open" && (
                      <>
                        <Button size="sm" variant="outline">
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive">
                          Cancel
                        </Button>
                      </>
                    )}
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

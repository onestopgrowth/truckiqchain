import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { MatchingFilters } from "@/components/matching-filters"

interface SearchParams {
  equipment?: string
  minXp?: string
  location?: string
  availability?: string
}

export default async function MatchingDashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const supabase = await createServerClient()
  const params = await searchParams

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get user profile to ensure they're a capacity finder
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single()

  if (profile?.role !== "capacity_finder") {
    redirect("/dashboard")
  }

  // Build query for carrier profiles with filters
  let query = supabase.from("carrier_profiles").select(`
      *,
      profiles!carrier_profiles_user_id_fkey (
        company_name,
        email,
        phone
      )
    `)

  // Apply filters
  if (params.equipment) {
    query = query.eq("equipment_type", params.equipment)
  }
  if (params.minXp) {
    query = query.gte("xp_score", Number.parseInt(params.minXp))
  }
  if (params.availability) {
    query = query.eq("availability_status", params.availability)
  }
  if (params.location) {
    query = query.or(`location_city.ilike.%${params.location}%,location_state.ilike.%${params.location}%`)
  }

  const { data: carriers } = await query.order("xp_score", { ascending: false })

  // Get user's capacity calls for quick matching
  const { data: userCapacityCalls } = await supabase
    .from("capacity_calls")
    .select("*")
    .eq("user_id", data.user.id)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(5)

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Carrier Matching Dashboard</h1>
          <p className="text-muted-foreground">Find qualified carriers for your capacity calls</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Filter Carriers</CardTitle>
              <CardDescription>Refine your search criteria</CardDescription>
            </CardHeader>
            <CardContent>
              <MatchingFilters />
            </CardContent>
          </Card>

          {userCapacityCalls && userCapacityCalls.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Quick Match</CardTitle>
                <CardDescription>Match against your active loads</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {userCapacityCalls.map((call) => (
                  <Link
                    key={call.id}
                    href={`/dashboard/matching?equipment=${call.equipment_needed}&minXp=${call.minimum_xp_score}`}
                    className="block"
                  >
                    <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <p className="font-medium text-sm truncate">{call.title}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {call.equipment_needed.replace("_", " ")}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          XP {call.minimum_xp_score}+
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Results */}
        <div className="lg:col-span-3">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">
              {carriers ? `${carriers.length} Matching Carriers` : "Loading..."}
            </h2>
            <div className="text-sm text-muted-foreground">
              {params.equipment && `Equipment: ${params.equipment.replace("_", " ")} • `}
              {params.minXp && `Min XP: ${params.minXp}+ • `}
              {params.availability && `Status: ${params.availability} • `}
              {params.location && `Location: ${params.location}`}
            </div>
          </div>

          {!carriers || carriers.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <h3 className="text-lg font-semibold mb-2">No Matching Carriers Found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your filters or check back later for new carrier profiles.
                </p>
                <Button asChild variant="outline">
                  <Link href="/dashboard/matching">Clear Filters</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {carriers.map((carrier) => (
                <Card key={carrier.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{carrier.profiles?.company_name || "Carrier Profile"}</CardTitle>
                        <CardDescription>
                          {carrier.location_city}, {carrier.location_state}
                          {carrier.location_zip && ` ${carrier.location_zip}`}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Badge
                          variant={
                            carrier.availability_status === "available"
                              ? "default"
                              : carrier.availability_status === "busy"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {carrier.availability_status.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">XP: {carrier.xp_score}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <h4 className="font-semibold text-sm text-muted-foreground mb-1">EQUIPMENT</h4>
                        <p className="text-sm capitalize">{carrier.equipment_type.replace("_", " ")}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-muted-foreground mb-1">CAPACITY</h4>
                        {carrier.capacity_weight ? (
                          <p className="text-sm">{carrier.capacity_weight.toLocaleString()} lbs</p>
                        ) : (
                          <p className="text-sm text-muted-foreground">Not specified</p>
                        )}
                        {carrier.capacity_length && (
                          <p className="text-sm">
                            {carrier.capacity_length}' × {carrier.capacity_width || "?"}' ×{" "}
                            {carrier.capacity_height || "?"}'
                          </p>
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-muted-foreground mb-1">CONTACT</h4>
                        <p className="text-sm">{carrier.profiles?.email}</p>
                        {carrier.profiles?.phone && <p className="text-sm">{carrier.profiles.phone}</p>}
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-muted-foreground mb-1">EXPERIENCE</h4>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-2">
                            <div className="bg-primary h-2 rounded-full" style={{ width: `${carrier.xp_score}%` }} />
                          </div>
                          <span className="text-sm font-medium">{carrier.xp_score}/100</span>
                        </div>
                      </div>
                    </div>

                    {carrier.notes && (
                      <div className="mt-4">
                        <h4 className="font-semibold text-sm text-muted-foreground mb-1">NOTES</h4>
                        <p className="text-sm">{carrier.notes}</p>
                      </div>
                    )}

                    <div className="flex justify-between items-center mt-4 pt-4 border-t">
                      <div className="text-xs text-muted-foreground">
                        Profile updated {new Date(carrier.updated_at).toLocaleDateString()}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          Contact Carrier
                        </Button>
                        <Button size="sm">Send Load Offer</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

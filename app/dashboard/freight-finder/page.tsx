import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { Truck, MapPin, Star, Filter } from "lucide-react"

export default async function FreightFinderDashboard() {
  const supabase = await createServerClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get user profile and check role
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

  // Get all available carriers for matching
  const { data: carriers } = await supabase
    .from("carrier_profiles")
    .select(`
      *,
      profiles!inner(company_name, email)
    `)
    .eq("availability_status", "available")

  const handleSignOut = async () => {
    "use server"
    const supabase = await createServerClient()
    await supabase.auth.signOut()
    redirect("/auth/login")
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-balance">
            Welcome, {profile?.company_name || data.user.email?.split("@")[0]}
          </h1>
          <p className="text-muted-foreground">Freight Finder Dashboard</p>
        </div>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/dashboard/capacity/post">
              <Truck className="w-4 h-4 mr-2" />
              Post New Load
            </Link>
          </Button>
          <form action={handleSignOut}>
            <Button variant="outline" type="submit">
              Sign Out
            </Button>
          </form>
        </div>
      </div>

      {/* Active Capacity Calls */}
      <Card>
        <CardHeader>
          <CardTitle>Your Active Loads</CardTitle>
          <CardDescription>Manage your posted capacity calls and view matching carriers</CardDescription>
        </CardHeader>
        <CardContent>
          {capacityCalls && capacityCalls.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Load ID</TableHead>
                  <TableHead>Origin</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Equipment</TableHead>
                  <TableHead>XP Min</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {capacityCalls.map((call) => (
                  <TableRow key={call.id}>
                    <TableCell className="font-mono text-sm">#{call.id.slice(-8)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {call.origin_city}, {call.origin_state}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {call.destination_city}, {call.destination_state}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{call.equipment_type.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        {call.minimum_xp}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">${call.rate?.toLocaleString() || "TBD"}</TableCell>
                    <TableCell>
                      <Badge variant={call.status === "active" ? "default" : "secondary"}>{call.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline">
                        View Matches
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Truck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No loads posted yet</h3>
              <p className="text-muted-foreground mb-4">
                Start by posting your first capacity call to find matching carriers
              </p>
              <Button asChild>
                <Link href="/dashboard/capacity/post">Post Your First Load</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Matched Carriers Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Available Carriers</CardTitle>
              <CardDescription>Carriers that match your equipment and XP requirements</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Equipment Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dry_van">Dry Van</SelectItem>
                  <SelectItem value="refrigerated">Refrigerated</SelectItem>
                  <SelectItem value="flatbed">Flatbed</SelectItem>
                  <SelectItem value="step_deck">Step Deck</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Sort by XP" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xp_high">XP High to Low</SelectItem>
                  <SelectItem value="xp_low">XP Low to High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {carriers && carriers.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {carriers.map((carrier) => (
                <Card key={carrier.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold">{carrier.profiles?.company_name || "Carrier"}</h4>
                        <p className="text-sm text-muted-foreground">
                          {carrier.location_city}, {carrier.location_state}
                        </p>
                      </div>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        {carrier.xp_score}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Equipment:</span>
                        <span className="font-medium">{carrier.equipment_type.replace("_", " ")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Capacity:</span>
                        <span className="font-medium">{carrier.capacity_weight} lbs</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge
                          variant={carrier.availability_status === "available" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {carrier.availability_status}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t">
                      <Button size="sm" className="w-full">
                        Contact Carrier
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Filter className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No carriers available</h3>
              <p className="text-muted-foreground">
                Check back later or adjust your requirements to find matching carriers
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

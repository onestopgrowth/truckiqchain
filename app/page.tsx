import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Carrier profile
  const { data: carrierProfile } = await supabase
    .from("carrier_profiles")
    .select(
      "id, user_id, company_name, equipment_type, dot_number, xp_score, availability_status, location_city, location_state"
    )
    .eq("user_id", user.id)
    .single();

  // Capacity calls count (for capacity finder view)
  const { count: capacityCallsCount } = await supabase
    .from("capacity_calls")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  // Vehicles (carrier only)
  let vehicles:
    | {
        id: string;
        vin: string | null;
        year: number | null;
        make: string | null;
        model: string | null;
        trailer_type: string | null;
      }[]
    | [] = [];

  if (carrierProfile) {
    const { data: vehicleRows } = await supabase
      .from("carrier_vehicles")
      .select("id, vin, year, make, model, trailer_type")
      .eq("carrier_profile_id", carrierProfile.id)
      .order("created_at", { ascending: true });
    vehicles = vehicleRows || [];
  }

  const signOut = async () => {
    "use server";
    const serverClient = await createServerClient();
    await serverClient.auth.signOut();
    redirect("/auth/login");
  };

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">FreightMatch Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {profile?.company_name || user.email}
          </p>
        </div>
        <form action={signOut}>
          <Button variant="outline" type="submit">
            Sign Out
          </Button>
        </form>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Role Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Your Role</CardTitle>
            <CardDescription>Account type & permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {profile?.role?.replace("_", " ") || "Not set"}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {profile?.role === "carrier"
                ? "Manage equipment & vehicle data; view capacity calls."
                : profile?.role === "capacity_finder"
                ? "Post capacity calls & match with carriers."
                : "Awaiting role assignment."}
            </p>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Get started</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {profile?.role === "carrier" ? (
              <>
                <Button asChild className="w-full">
                  <Link href="/dashboard/carrier/profile">
                    {carrierProfile
                      ? "Update Carrier Profile"
                      : "Create Carrier Profile"}
                  </Link>
                </Button>
                <Button asChild className="w-full" variant="outline">
                  <Link href="/dashboard/capacity/browse">
                    Browse Capacity Calls
                  </Link>
                </Button>
                <Button asChild className="w-full" variant="secondary">
                  <Link href="/dashboard/carrier/vehicles">
                    Manage Vehicles
                  </Link>
                </Button>
              </>
            ) : profile?.role === "capacity_finder" ? (
              <>
                <Button asChild className="w-full">
                  <Link href="/dashboard/capacity/post">
                    Post Capacity Call
                  </Link>
                </Button>
                <Button asChild className="w-full" variant="outline">
                  <Link href="/dashboard/matching">Find Matching Carriers</Link>
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Role not configured. Contact support.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Carrier Profile Summary */}
        {profile?.role === "carrier" && carrierProfile && (
          <Card>
            <CardHeader>
              <CardTitle>Carrier Profile</CardTitle>
              <CardDescription>Status & identifiers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="font-medium">DOT Number:</span>{" "}
                {carrierProfile.dot_number || "—"}
              </div>
              <div>
                <span className="font-medium">Equipment:</span>{" "}
                {carrierProfile.equipment_type?.replace("_", " ") || "—"}
              </div>
              <div>
                <span className="font-medium">XP Score:</span>{" "}
                {carrierProfile.xp_score ?? "—"}
              </div>
              <div>
                <span className="font-medium">Status:</span>{" "}
                <span className="capitalize">
                  {carrierProfile.availability_status || "—"}
                </span>
              </div>
              <div>
                <span className="font-medium">Location:</span>{" "}
                {carrierProfile.location_city || "—"},{" "}
                {carrierProfile.location_state || ""}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Capacity Finder Stats */}
        {profile?.role === "capacity_finder" && (
          <Card>
            <CardHeader>
              <CardTitle>My Capacity Calls</CardTitle>
              <CardDescription>Posted loads</CardDescription>
            </CardHeader>
            <CardContent className="text-center py-4">
              <div className="text-2xl font-bold">
                {capacityCallsCount || 0}
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Active loads posted
              </p>
              <div className="flex gap-2 justify-center">
                <Button asChild size="sm" variant="outline">
                  <Link href="/dashboard/capacity/manage">Manage Loads</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/dashboard/matching">Find Carriers</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vehicles */}
        {profile?.role === "carrier" && (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle>Fleet Vehicles</CardTitle>
              <CardDescription>VIN, trailer & specs</CardDescription>
            </CardHeader>
            <CardContent>
              {vehicles.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No vehicles added yet.{" "}
                  <Link
                    href="/dashboard/carrier/vehicles"
                    className="underline"
                  >
                    Add one
                  </Link>
                  .
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left border-b">
                      <tr className="h-8">
                        <th className="pr-4 font-medium">VIN</th>
                        <th className="pr-4 font-medium">Year</th>
                        <th className="pr-4 font-medium">Make</th>
                        <th className="pr-4 font-medium">Model</th>
                        <th className="pr-4 font-medium">Trailer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vehicles.map((v) => (
                        <tr key={v.id} className="border-b last:border-0">
                          <td className="py-2 pr-4 font-mono">
                            {v.vin || "—"}
                          </td>
                          <td className="py-2 pr-4">{v.year || "—"}</td>
                          <td className="py-2 pr-4">{v.make || "—"}</td>
                          <td className="py-2 pr-4">{v.model || "—"}</td>
                          <td className="py-2 pr-4">
                            {v.trailer_type?.replace("_", " ") || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-4">
                    <Button asChild size="sm" variant="outline">
                      <Link href="/dashboard/carrier/vehicles">
                        Manage Vehicles
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle>Account Info</CardTitle>
            <CardDescription>Details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Email:</span> {user.email}
            </div>
            <div>
              <span className="font-medium">Company:</span>{" "}
              {profile?.company_name || "Not set"}
            </div>
            <div>
              <span className="font-medium">Phone:</span>{" "}
              {profile?.phone || "Not set"}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

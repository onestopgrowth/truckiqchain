import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createServerClient();

  // Auth user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Profile (only needed cols)
  const { data: profile } = await supabase
    .from("profiles")
    .select("id,role,company_name,phone")
    .eq("id", user.id)
    .single();

  if (!profile?.role) redirect("/onboarding/role");

  // Carrier profile (maybe)
  const { data: carrierProfile } = await supabase
    .from("carrier_profiles")
    .select(
      "id,dot_number,equipment_type,xp_score,availability_status,location_city,location_state"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  // Capacity finder redirect
  if (profile.role === "capacity_finder") {
    redirect("/dashboard/freight-finder");
  }

  // Vehicles count
  let vehiclesCount = 0;
  if (profile.role === "carrier" && carrierProfile?.id) {
    const { count } = await supabase
      .from("carrier_vehicles")
      .select("id", { count: "exact", head: true })
      .eq("carrier_profile_id", carrierProfile.id);
    vehiclesCount = count ?? 0;
  }

  // (Optional) capacity calls count (used if you add UI later)
  const { count: capacityCallsCount } = await supabase
    .from("capacity_calls")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const needsCarrierProfile =
    profile.role === "carrier" && !carrierProfile?.dot_number;

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">FreightMatch Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {profile.company_name || user.email}
          </p>
        </div>
        {/* Uses /auth/logout route */}
        <form method="post" action="/auth/logout">
          <Button variant="outline" type="submit">
            Sign Out
          </Button>
        </form>
      </div>

      {/* Carrier profile completion prompt */}
      {needsCarrierProfile && (
        <Card className="mb-8 border-dashed">
          <CardHeader>
            <CardTitle>Complete Your Carrier Profile</CardTitle>
            <CardDescription>
              Finish your profile to unlock all carrier features.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/carrier/profile">Complete Profile</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Role */}
        <Card>
          <CardHeader>
            <CardTitle>Your Role</CardTitle>
            <CardDescription>Account type and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {profile.role.replace("_", " ")}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {profile.role === "carrier"
                ? "Create carrier profile, manage vehicles, view capacity calls"
                : "Role not configured"}
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
            {profile.role === "carrier" ? (
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
            ) : (
              <p className="text-sm text-muted-foreground">
                Role not configured. Contact support.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Carrier Profile Summary */}
        {profile.role === "carrier" && (
          <Card>
            <CardHeader>
              <CardTitle>Carrier Profile</CardTitle>
              <CardDescription>Status</CardDescription>
            </CardHeader>
            <CardContent>
              {carrierProfile ? (
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">DOT:</span>{" "}
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
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    No carrier profile yet
                  </p>
                  <Button asChild size="sm">
                    <Link href="/dashboard/carrier/profile">
                      Create Profile
                    </Link>
                  </Button>
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
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Email:</span> {user.email}
              </div>
              <div>
                <span className="font-medium">Company:</span>{" "}
                {profile.company_name || "Not set"}
              </div>
              <div>
                <span className="font-medium">Phone:</span>{" "}
                {profile.phone || "Not set"}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle prompt */}
        {profile.role === "carrier" && vehiclesCount === 0 && (
          <Card className="md:col-span-2 lg:col-span-3 border-dashed">
            <CardHeader>
              <CardTitle>Add Your First Vehicle</CardTitle>
              <CardDescription>
                Improve trust & matching accuracy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Add VIN and trailer details so shippers can evaluate fit.
              </p>
              <Button asChild>
                <Link href="/dashboard/carrier/vehicles">Add Vehicle</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

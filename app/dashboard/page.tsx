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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profile?.role === "capacity_finder") {
    redirect("/dashboard/freight-finder");
  }

  const { data: carrierProfile } = await supabase
    .from("carrier_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const { count: capacityCallsCount } = await supabase
    .from("capacity_calls")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const signOut = async () => {
    "use server";
    const serverClient = await createServerClient();
    await serverClient.auth.signOut();
    redirect("/auth/login");
  };

  return (
    <div className="container mx-auto p-6">
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
        <Card>
          <CardHeader>
            <CardTitle>Your Role</CardTitle>
            <CardDescription>Account type and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {profile?.role?.replace("_", " ") || "Not set"}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {profile?.role === "carrier"
                ? "You can create carrier profiles and view capacity calls"
                : profile?.role === "capacity_finder"
                ? "You can post capacity calls and view carrier profiles"
                : "Please contact support to set your role"}
            </p>
          </CardContent>
        </Card>

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

        {profile?.role === "carrier" && (
          <Card>
            <CardHeader>
              <CardTitle>Carrier Profile</CardTitle>
              <CardDescription>Status</CardDescription>
            </CardHeader>
            <CardContent>
              {carrierProfile ? (
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Equipment:</span>{" "}
                    {carrierProfile.equipment_type.replace("_", " ")}
                  </div>
                  <div>
                    <span className="font-medium">XP Score:</span>{" "}
                    {carrierProfile.xp_score}/100
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>{" "}
                    <span className="capitalize">
                      {carrierProfile.availability_status}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Location:</span>{" "}
                    {carrierProfile.location_city},{" "}
                    {carrierProfile.location_state}
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

        {profile?.role === "capacity_finder" && (
          <Card>
            <CardHeader>
              <CardTitle>My Capacity Calls</CardTitle>
              <CardDescription>Posted loads</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <div className="text-2xl font-bold">
                  {capacityCallsCount || 0}
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Active loads posted
                </p>
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href="/dashboard/capacity/manage">Manage Loads</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href="/dashboard/matching">Find Carriers</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                {profile?.company_name || "Not set"}
              </div>
              <div>
                <span className="font-medium">Phone:</span>{" "}
                {profile?.phone || "Not set"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

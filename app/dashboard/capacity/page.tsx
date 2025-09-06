import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function CapacityFinderHome() {
  const sb = await createServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: profile } = await sb
    .from("profiles")
    .select("id,role,company_name")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "capacity_finder") redirect("/dashboard");

  const { count: openLoads } = await sb
    .from("loads")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "open");

  const { count: pendingAssignments } = await sb
    .from("assignments")
    .select("*", { count: "exact", head: true })
    .eq("load_owner_user_id", user.id)
    .eq("status", "requested");

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Capacity Finder</h1>
          <p className="text-muted-foreground text-sm">
            {profile?.company_name || user.email}
          </p>
        </div>
        <Button asChild variant="ghost">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Post a Load</CardTitle>
            <CardDescription>
              Create a new shipment to match with carriers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/capacity/loads/post">Post Load</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Manage Loads</CardTitle>
            <CardDescription>
              View and manage your posted freight
              {typeof openLoads === "number" ? ` — ${openLoads} open` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link href="/dashboard/capacity/loads/manage">Open Loads</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Find Carriers</CardTitle>
            <CardDescription>
              Search verified carriers and send offers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link href="/dashboard/capacity/matching">Browse Carriers</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Assignments</CardTitle>
            <CardDescription>
              Track booking and delivery status
              {typeof pendingAssignments === "number"
                ? ` — ${pendingAssignments} pending`
                : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link href="/dashboard/capacity/owner/assignments">
                View Assignments
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

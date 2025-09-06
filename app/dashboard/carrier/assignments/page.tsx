import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CarrierActions, WaypointForm } from "../../../../components/assignments-carrier-client";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CarrierAssignmentsPage() {
  const sb = await createServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: profile } = await sb
    .from("profiles")
    .select("id,role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "carrier") redirect("/dashboard");

  const { data } = await sb
    .from("assignments")
    .select("id,load_id,status,booked_at,in_transit_at,delivered_at")
    .eq("carrier_user_id", user.id)
    .order("booked_at", { ascending: false });
  const rows = data || [];
  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Assignments (Carrier)</h1>
        <Button asChild variant="ghost">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
      <div className="grid gap-4">
        {rows.map((r) => (
          <Card key={r.id}>
            <CardHeader className="py-3">
              <CardTitle className="text-base">
                Assignment {r.id.slice(0, 8)}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  ({r.status})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-2">
              <CarrierActions id={r.id} status={r.status} />
              <WaypointForm id={r.id} />
            </CardContent>
          </Card>
        ))}
        {!rows.length && (
          <p className="text-sm text-muted-foreground">No assignments yet.</p>
        )}
      </div>
    </div>
  );
}

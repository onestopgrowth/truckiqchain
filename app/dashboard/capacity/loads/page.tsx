import { createServerClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import RequestAssignmentButton from "@/components/request-assignment-button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

async function LoadsList({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const sb = await createServerClient();
  const origin_state = searchParams.origin_state || "";
  const destination_state = searchParams.destination_state || "";
  const equipment = searchParams.equipment || "";

  let url = `/api/loads/browse?`;
  const p: string[] = [];
  if (origin_state) p.push(`origin_state=${encodeURIComponent(origin_state)}`);
  if (destination_state)
    p.push(`destination_state=${encodeURIComponent(destination_state)}`);
  if (equipment) p.push(`equipment=${encodeURIComponent(equipment)}`);
  url += p.join("&");

  const res = await fetch(url, { cache: "no-store" });
  const body = await res.json();
  const rows = body.data || [];

  return (
    <div className="grid gap-4">
      {rows.map((l: any) => (
        <Card key={l.id} className="border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">
                <Link
                  href={`/dashboard/capacity/loads/${l.id}`}
                  className="hover:underline"
                >
                  {l.title ||
                    `${l.origin_city}, ${l.origin_state} → ${l.destination_city}, ${l.destination_state}`}
                </Link>
              </CardTitle>
              <div className="flex gap-2 flex-wrap items-center">
                {l.equipment_required?.map((e: string) => (
                  <Badge key={e} variant="secondary" className="text-xs">
                    {e}
                  </Badge>
                ))}
                <RequestAssignmentButton loadId={l.id} />
              </div>
            </div>
            <CardDescription>
              {l.origin_city}, {l.origin_state} → {l.destination_city},{" "}
              {l.destination_state}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            {l.weight_lbs && <div>Weight: {l.weight_lbs} lbs</div>}
            {l.pickup_earliest && (
              <div>PU: {new Date(l.pickup_earliest).toLocaleDateString()}</div>
            )}
          </CardContent>
        </Card>
      ))}
      {!rows.length && (
        <p className="text-sm text-muted-foreground">
          No loads match your filters.
        </p>
      )}
    </div>
  );
}

export default async function BrowseLoadsPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Browse Loads</CardTitle>
          <CardDescription>Filter by lane and equipment</CardDescription>
        </CardHeader>
        <CardContent>
          <form method="GET" className="grid md:grid-cols-4 gap-4 mb-6">
            <Input
              name="origin_state"
              placeholder="Origin State"
              defaultValue={searchParams.origin_state || ""}
            />
            <Input
              name="destination_state"
              placeholder="Destination State"
              defaultValue={searchParams.destination_state || ""}
            />
            <Input
              name="equipment"
              placeholder="Equipment (comma)"
              defaultValue={searchParams.equipment || ""}
            />
            <Button type="submit">Apply</Button>
          </form>
          <Suspense
            fallback={
              <p className="text-sm text-muted-foreground">Loading loads...</p>
            }
          >
            <LoadsList searchParams={searchParams} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

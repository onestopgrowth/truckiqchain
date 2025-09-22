import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { MatchingFilters } from "@/components/matching-filters";
import { OfferButton } from "@/components/offer-button";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface SearchParams {
  equipment?: string;
  minXp?: string;
  location?: string;
  availability?: string;
}

export const dynamic = "force-dynamic";

export default async function CapacityMatchingPage({
  searchParams,
}: {
  searchParams: SearchParams | Promise<SearchParams>;
}) {
  const supabase = await createServerClient();
  // Support both direct object and Promise (for server navigation)
  let params: SearchParams;
  if (
    typeof searchParams === "object" &&
    searchParams !== null &&
    "then" in searchParams
  ) {
    params = await (searchParams as Promise<SearchParams>);
  } else {
    params = searchParams as SearchParams;
  }

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single();
  if (profile?.role !== "capacity_finder") redirect("/dashboard");

  let query = supabase
    .from("carrier_profiles")
    .select(
      `*, profiles!carrier_profiles_user_id_fkey ( company_name, email, phone )`
    );
  if (params.equipment) query = query.eq("equipment_type", params.equipment);
  if (params.minXp)
    query = query.gte("xp_score", Number.parseInt(params.minXp));
  if (params.availability)
    query = query.eq("availability_status", params.availability);
  if (params.location)
    query = query.or(
      `location_city.ilike.%${params.location}%,location_state.ilike.%${params.location}%`
    );

  const { data: carriersRaw } = await query; // we'll sort by composite score below
  const { data: loads } = await supabase
    .from("loads")
    .select(
      "id,title,origin_city,origin_state,destination_city,destination_state,equipment_required,status"
    )
    .eq("user_id", data.user.id)
    .in("status", ["open", "accepted", "booked"]);

  // Fetch assignments for these loads to check if an offer has already been sent to each carrier
  const loadIds = (loads || []).map((l: any) => l.id);
  let assignments: any[] = [];
  if (loadIds.length > 0) {
    const { data: asgs } = await supabase
      .from("assignments")
      .select("id,load_id,carrier_user_id,assignment_type")
      .in("load_id", loadIds)
      .eq("assignment_type", "owner_invite");
    assignments = asgs || [];
  }

  // Simple scoring: equipment match (+40), state lane hint (+20), verified (+30), normalized XP (+0..10)
  function scoreCarrier(carrier: any) {
    let s = 0;
    const equip = String(carrier.equipment_type || "").toLowerCase();
    const ls = loads || [];
    const hasEquipMatch = ls.some(
      (l) =>
        Array.isArray(l.equipment_required) &&
        l.equipment_required
          .map((x: string) => String(x).toLowerCase())
          .includes(equip)
    );
    if (hasEquipMatch) s += 40;
    const hasStateHint = ls.some(
      (l) =>
        l.origin_state &&
        carrier.location_state &&
        l.origin_state === carrier.location_state
    );
    if (hasStateHint) s += 20;
    if (carrier.verified) s += 30;
    s += Math.min(10, Math.max(0, Number(carrier.xp_score) || 0));
    return s;
  }

  const carriers = (carriersRaw || [])
    .map((c: any) => ({ ...c, _score: scoreCarrier(c) }))
    .sort((a: any, b: any) => b._score - a._score);

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-8">
      {/* Header row with Back to Dashboard button */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Capacity Matching</h1>
        <Link href="/dashboard">
          <Button variant="outline" size="sm">
            Back to Dashboard
          </Button>
        </Link>
      </div>
      <MatchingFilters />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {carriers.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground">
            No matching carriers found.
          </div>
        )}
        {carriers.map((carrier: any) => {
          // Check if an offer has already been sent to this carrier for any of the user's loads
          const offerSent = assignments.some(
            (asg) => asg.carrier_user_id === carrier.user_id
          );
          return (
            <Card key={carrier.id}>
              <CardHeader>
                <CardTitle>
                  {carrier.profiles?.company_name || "Unknown Carrier"}
                </CardTitle>
                <CardDescription>
                  {carrier.profiles?.email} | {carrier.profiles?.phone}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-2">
                  <span className="font-semibold">Equipment:</span>{" "}
                  {carrier.equipment_type || "N/A"}
                </div>
                <div className="mb-2">
                  <span className="font-semibold">Location:</span>{" "}
                  {carrier.location_city}, {carrier.location_state}
                </div>
                <div className="mb-2">
                  <span className="font-semibold">XP Score:</span>{" "}
                  {carrier.xp_score}
                </div>
                <div className="mb-2">
                  <span className="font-semibold">Availability:</span>{" "}
                  {carrier.availability_status}
                </div>
                <OfferButton
                  carrierUserId={carrier.user_id}
                  loads={loads || []}
                  offerSent={offerSent}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

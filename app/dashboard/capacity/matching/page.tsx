import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { MatchingFilters } from "@/components/matching-filters";

interface SearchParams { equipment?: string; minXp?: string; location?: string; availability?: string }

export const dynamic = "force-dynamic";

export default async function CapacityMatchingPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const supabase = await createServerClient();
  const params = await searchParams;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) redirect("/auth/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
  if (profile?.role !== "capacity_finder") redirect("/dashboard");

  let query = supabase.from("carrier_profiles").select(`*, profiles!carrier_profiles_user_id_fkey ( company_name, email, phone )`);
  if (params.equipment) query = query.eq("equipment_type", params.equipment);
  if (params.minXp) query = query.gte("xp_score", Number.parseInt(params.minXp));
  if (params.availability) query = query.eq("availability_status", params.availability);
  if (params.location) query = query.or(`location_city.ilike.%${params.location}%,location_state.ilike.%${params.location}%`);

  const { data: carriers } = await query.order("xp_score", { ascending: false });
  const { data: loads } = await supabase.from("loads").select("id,title,origin_city,origin_state,destination_city,destination_state,status").eq("user_id", data.user.id).in("status", ["open","accepted","booked"]);

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Find Carriers</h1>
          <p className="text-muted-foreground">Search and send load offers</p>
        </div>
        <Button asChild variant="ghost"><Link href="/dashboard">Back to Dashboard</Link></Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Refine carriers</CardDescription>
            </CardHeader>
            <CardContent>
              <MatchingFilters />
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-3">
          {!carriers || carriers.length === 0 ? (
            <Card><CardContent className="text-center py-12">No matching carriers.</CardContent></Card>
          ) : (
            <div className="grid gap-4">
              {carriers.map((carrier) => (
                <Card key={carrier.id} className="hover:shadow-sm">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{carrier.profiles?.company_name || "Carrier"}</CardTitle>
                        <CardDescription>{carrier.location_city}, {carrier.location_state}</CardDescription>
                      </div>
                      <div className="text-xs text-muted-foreground">XP {carrier.xp_score}</div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-muted-foreground">Equipment: {carrier.equipment_type?.replace("_"," ")}</div>
                      <OfferButton carrierUserId={carrier.user_id} loads={loads || []} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";
import * as React from "react";
import { useTransition } from "react";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

function OfferButton({ carrierUserId, loads }: { carrierUserId: string; loads: any[] }){
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>Send Load Offer</Button>
      {open && <OfferModal onClose={() => setOpen(false)} carrierUserId={carrierUserId} loads={loads} />}
    </>
  )
}

function OfferModal({ onClose, carrierUserId, loads }: { onClose: () => void; carrierUserId: string; loads: any[] }){
  const [selected, setSelected] = React.useState<string>("");
  const [pending, start] = useTransition();
  async function sendOffer(){
    if(!selected) return;
    start(async () => {
      const res = await fetch("/api/owner/invitations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ carrier_user_id: carrierUserId, load_id: selected }) });
      if (res.ok) onClose();
    });
  }
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-background w-full max-w-md rounded-md border p-4 space-y-4">
        <h3 className="font-semibold">Send Load Offer</h3>
        <div className="text-xs text-muted-foreground">Choose one of your open/active loads to offer this carrier.</div>
        <Select onValueChange={setSelected}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Select a load" /></SelectTrigger>
          <SelectContent>
            {loads.map((l) => (
              <SelectItem key={l.id} value={l.id}>{l.title || `${l.origin_city}, ${l.origin_state} → ${l.destination_city}, ${l.destination_state}`} ({l.status})</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={!selected || pending} onClick={sendOffer}>{pending ? "Sending…" : "Send Offer"}</Button>
        </div>
      </div>
    </div>
  )
}

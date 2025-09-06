import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

("use client");
import * as React from "react";

function CarrierActions({ id, status }: { id: string; status: string }) {
  const [s, setS] = React.useState(status);
  async function act(a: string, extra?: any) {
    const res = await fetch(`/api/assignments/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: a, ...extra }),
    });
    const json = await res.json();
    if (res.ok) setS(json.status);
  }
  return (
    <div className="flex gap-2">
      {s === "booked" && (
        <Button size="sm" onClick={() => act("start")}>
          Start Transit
        </Button>
      )}
      {s === "in_transit" && (
        <Button size="sm" onClick={() => act("deliver")}>
          Mark Delivered
        </Button>
      )}
    </div>
  );
}

function WaypointForm({ id }: { id: string }) {
  const [note, setNote] = React.useState("");
  const [lat, setLat] = React.useState("");
  const [lon, setLon] = React.useState("");
  const [pending, setPending] = React.useState(false);
  async function submit() {
    setPending(true);
    const res = await fetch(`/api/assignments/${id}/waypoints`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lat: lat ? Number(lat) : null,
        lon: lon ? Number(lon) : null,
        note,
      }),
    });
    setPending(false);
    if (res.ok) {
      setNote("");
      setLat("");
      setLon("");
    }
  }
  return (
    <div className="flex gap-2 items-end flex-wrap">
      <div className="flex flex-col">
        <label className="text-[11px] text-muted-foreground">Lat</label>
        <input
          className="border rounded px-2 py-1 text-xs"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          placeholder="e.g., 32.78"
        />
      </div>
      <div className="flex flex-col">
        <label className="text-[11px] text-muted-foreground">Lon</label>
        <input
          className="border rounded px-2 py-1 text-xs"
          value={lon}
          onChange={(e) => setLon(e.target.value)}
          placeholder="e.g., -96.81"
        />
      </div>
      <div className="flex flex-col flex-1 min-w-[200px]">
        <label className="text-[11px] text-muted-foreground">Note</label>
        <input
          className="border rounded px-2 py-1 text-xs"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Checkpoint, ETA, etc."
        />
      </div>
      <Button size="sm" onClick={submit} disabled={pending}>
        Add Waypoint
      </Button>
    </div>
  );
}

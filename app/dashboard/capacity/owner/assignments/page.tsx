"use client";
import * as React from "react";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function OwnerAssignmentsPage() {
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
  if (profile?.role !== "capacity_finder") redirect("/dashboard");

  const { data } = await sb
    .from("assignments")
    .select(
      "id,load_id,status,requested_at,accepted_at,booked_at,in_transit_at,delivered_at,completed_at,carrier_user_id"
    )
    .in("load_id", sb.from("loads").select("id").eq("user_id", user.id) as any)
    .order("requested_at", { ascending: false });
  const rows = data || [];
  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Assignments (Owner)</h1>
        <Button asChild variant="ghost">
          <Link href="/dashboard/capacity">Back to Dashboard</Link>
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
            <CardContent className="text-xs space-y-3">
              <div className="flex gap-4 flex-wrap items-center">
                <span>Load: {r.load_id}</span>
                <span>Status: {r.status}</span>
                <OwnerActions id={r.id} status={r.status} />
              </div>
              <WaypointList id={r.id} />
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

function OwnerActions({ id, status }: { id: string; status: string }) {
  const [s, setS] = React.useState(status);
  const [pod, setPod] = React.useState("");
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
    <div className="flex gap-2 items-end flex-wrap">
      {s === "requested" && (
        <Button size="sm" onClick={() => act("accept")}>
          Accept
        </Button>
      )}
      {s === "requested" && (
        <Button size="sm" variant="outline" onClick={() => act("decline")}>
          Decline
        </Button>
      )}
      {(s === "accepted" || s === "requested") && (
        <Button size="sm" onClick={() => act("book")}>
          Book
        </Button>
      )}
      {["requested", "accepted", "booked"].includes(s) && (
        <Button size="sm" variant="outline" onClick={() => act("cancel")}>
          Cancel
        </Button>
      )}
      {s === "delivered" && (
        <>
          <div className="flex flex-col">
            <label className="text-[11px] text-muted-foreground">POD URL</label>
            <input
              className="border rounded px-2 py-1 text-xs min-w-[220px]"
              value={pod}
              onChange={(e) => setPod(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <Button
            size="sm"
            onClick={() => act("complete", { pod_url: pod })}
            disabled={!pod}
          >
            Close Load
          </Button>
        </>
      )}
    </div>
  );
}

function WaypointList({ id }: { id: string }) {
  const [items, setItems] = React.useState<any[]>([]);
  React.useEffect(() => {
    fetch(`/api/assignments/${id}/waypoints`)
      .then((r) => r.json())
      .then((j) => {
        if (j?.data) setItems(j.data);
      });
  }, [id]);
  if (!items.length) return null;
  return (
    <div className="border rounded p-2">
      <div className="font-medium mb-2">Waypoints</div>
      <div className="space-y-1">
        {items.map((w) => (
          <div key={w.id} className="flex justify-between gap-2">
            <div className="text-muted-foreground">
              {new Date(w.recorded_at).toLocaleString()}
            </div>
            <div>
              {w.lat ?? "-"}, {w.lon ?? "-"}
            </div>
            <div className="flex-1 text-right">{w.note || ""}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

export function CarrierActions({ id, status }: { id: string; status: string }) {
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

export function WaypointForm({ id }: { id: string }) {
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

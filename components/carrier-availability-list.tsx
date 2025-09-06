"use client";
import React, { useState } from "react";
import CarrierAvailabilityForm from "./carrier-availability-form";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

export default function CarrierAvailabilityList({ items }: { items: any[] }) {
  const [rows, setRows] = useState(items);
  const [editing, setEditing] = useState<any | null>(null);
  async function remove(id: string) {
    if (!confirm("Delete availability?")) return;
    const res = await fetch(`/api/carrier/availability/${id}`, {
      method: "DELETE",
    });
    if (res.ok) setRows((r) => r.filter((x) => x.id !== id));
  }
  function refreshed() {
    window.location.reload();
  }
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div
          key={r.id}
          className="border rounded p-3 text-xs flex flex-col gap-2"
        >
          <div className="flex justify-between">
            <div className="font-mono text-[11px]">
              {r.start_at?.slice(0, 16)} → {r.end_at?.slice(0, 16)}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(r)}>
                Edit
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => remove(r.id)}
              >
                Delete
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {r.equipment?.map((e: string) => (
              <Badge key={e} variant="secondary" className="text-[10px]">
                {e}
              </Badge>
            ))}
          </div>
        </div>
      ))}
      {!rows.length && (
        <p className="text-xs text-muted-foreground">
          No availability windows yet.
        </p>
      )}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-background p-4 rounded shadow w-full max-w-sm space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold">Edit Availability</h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditing(null)}
              >
                Close
              </Button>
            </div>
            <CarrierAvailabilityForm existing={editing} onSaved={refreshed} />
          </div>
        </div>
      )}
    </div>
  );
}

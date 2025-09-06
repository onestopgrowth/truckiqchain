"use client";
import React, { useState } from "react";
import { Button } from "./ui/button";

export default function CarrierAvailabilityForm({
  existing,
  onSaved,
}: {
  existing?: any;
  onSaved?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOk(false);
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    const payload: any = Object.fromEntries(fd.entries());
    const method = existing ? "PATCH" : "POST";
    const url = existing
      ? `/api/carrier/availability/${existing.id}`
      : "/api/carrier/availability";
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) setError(json.error || "failed");
      else {
        setOk(true);
        if (!existing) form.reset();
        onSaved?.();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-1">
        <label className="text-xs font-medium">Start (UTC)</label>
        <input
          name="start_at"
          type="datetime-local"
          required
          defaultValue={existing ? existing.start_at?.substring(0, 16) : ""}
          className="border rounded px-2 py-1 text-xs bg-background"
        />
      </div>
      <div className="grid gap-1">
        <label className="text-xs font-medium">End (UTC)</label>
        <input
          name="end_at"
          type="datetime-local"
          required
          defaultValue={existing ? existing.end_at?.substring(0, 16) : ""}
          className="border rounded px-2 py-1 text-xs bg-background"
        />
      </div>
      <div className="grid gap-1">
        <label className="text-xs font-medium">Location</label>
        <input
          name="location"
          type="text"
          defaultValue={existing?.location || ""}
          className="border rounded px-2 py-1 text-xs bg-background"
        />
      </div>
      <div className="grid gap-1">
        <label className="text-xs font-medium">Radius (miles)</label>
        <input
          name="radius_miles"
          type="number"
          defaultValue={existing?.radius_miles || ""}
          className="border rounded px-2 py-1 text-xs bg-background"
        />
      </div>
      <div className="grid gap-1">
        <label className="text-xs font-medium">Equipment (comma)</label>
        <input
          name="equipment"
          type="text"
          defaultValue={existing?.equipment?.join(",") || ""}
          className="border rounded px-2 py-1 text-xs bg-background"
        />
      </div>
      {error && <div className="text-xs text-red-600">{error}</div>}
      {ok && <div className="text-xs text-green-600">Saved.</div>}
      <Button size="sm" type="submit" disabled={loading}>
        {loading ? "Saving..." : existing ? "Update" : "Create"}
      </Button>
    </form>
  );
}

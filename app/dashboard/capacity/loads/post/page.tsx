"use client";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PostLoadPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    const payload: any = Object.fromEntries(fd.entries());
    payload.equipment_required = payload.equipment_required
      ? (payload.equipment_required as string)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/loads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed");
      router.push("/dashboard/capacity/loads/manage");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-3xl font-bold">Post Load</h1>
          <p className="text-muted-foreground">Provide lane and requirements</p>
        </div>
  <Button asChild variant="ghost"><Link href="/dashboard">Back to Dashboard</Link></Button>
      </div>
      <Card>
        <CardContent>
          <form onSubmit={submit} className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="grid gap-1.5 md:col-span-3">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                required
                placeholder="e.g., Dallas, TX → Atlanta, GA — 10k lbs Dry Van"
              />
            </div>
            <Input required name="origin_city" placeholder="Origin City" />
            <Input required name="origin_state" placeholder="Origin State" />
            <Input name="origin_zip" placeholder="Origin ZIP" />
            <Input
              required
              name="destination_city"
              placeholder="Destination City"
            />
            <Input
              required
              name="destination_state"
              placeholder="Destination State"
            />
            <Input name="destination_zip" placeholder="Destination ZIP" />
            <Input
              type="datetime-local"
              name="pickup_earliest"
              placeholder="Pickup Earliest"
            />
            <Input
              type="datetime-local"
              name="pickup_latest"
              placeholder="Pickup Latest"
            />
            <Input
              type="datetime-local"
              name="delivery_earliest"
              placeholder="Delivery Earliest"
            />
            <Input
              type="datetime-local"
              name="delivery_latest"
              placeholder="Delivery Latest"
            />
            <Input
              name="equipment_required"
              placeholder="Equipment (comma list)"
              className="md:col-span-3"
            />
            <Input name="weight_lbs" placeholder="Weight (lbs)" />
            <Input name="pieces" placeholder="Pieces" />
            <Input name="length_feet" placeholder="Length (ft)" />
            <Textarea
              name="notes"
              placeholder="Notes"
              className="md:col-span-3"
            />
            {error && <div className="text-red-600 md:col-span-3">{error}</div>}
            <div className="md:col-span-3 flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? "Posting..." : "Post Load"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

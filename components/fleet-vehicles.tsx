"use client";
import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeleteVehicleButton } from "@/components/delete-vehicle-button";
import { createSupabaseClient } from "@/lib/supabase/client";

export default function FleetVehicles() {
  type Vehicle = {
    id: string;
    vin: string | null;
    year: number | null;
    make: string | null;
    model: string | null;
    trailer_type: string | null;
  };
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    vin: "",
    year: "",
    make: "",
    model: "",
    trailer_type: "",
  });
  const [adding, setAdding] = useState(false);

  const fetchVehicles = async () => {
    setLoading(true);
    const sb = createSupabaseClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    console.log("Supabase user in fetchVehicles:", user);
    if (!user) {
      setVehicles([]);
      setLoading(false);
      return;
    }
    const { data: carrierProfile } = await sb
      .from("carrier_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();
    console.log("Carrier profile:", carrierProfile);
    const profile: any = carrierProfile;
    if (!profile) {
      setVehicles([]);
      setLoading(false);
      return;
    }
    const { data: vehicles } = await sb
      .from("carrier_vehicles")
      .select("id, vin, year, make, model, trailer_type")
      .eq("carrier_profile_id", profile.id)
      .order("created_at");
    console.log("Vehicles fetched:", vehicles);
    setVehicles((vehicles as Vehicle[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAdding(true);
    // Use API route for add
    await fetch("/api/carrier-vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ vin: "", year: "", make: "", model: "", trailer_type: "" });
    setAdding(false);
    await fetchVehicles();
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Fleet Vehicles</CardTitle>
          <CardDescription>Your current inventory</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : !vehicles.length ? (
            <p className="text-sm text-muted-foreground">No vehicles yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left border-b">
                  <tr className="h-8">
                    <th className="pr-4">VIN</th>
                    <th className="pr-4">Year</th>
                    <th className="pr-4">Make</th>
                    <th className="pr-4">Model</th>
                    <th className="pr-4">Trailer</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((v) => (
                    <tr key={v.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-mono">{v.vin || "—"}</td>
                      <td className="py-2 pr-4">{v.year || "—"}</td>
                      <td className="py-2 pr-4">{v.make || "—"}</td>
                      <td className="py-2 pr-4">{v.model || "—"}</td>
                      <td className="py-2 pr-4">{v.trailer_type || "—"}</td>
                      <td className="py-2 pr-4">
                        <DeleteVehicleButton id={v.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <Card id="add">
        <CardHeader>
          <CardTitle>Add Vehicle</CardTitle>
          <CardDescription>Provide key identifiers</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="grid gap-4 md:grid-cols-2">
            <Input
              name="vin"
              placeholder="VIN (17 chars)"
              pattern=".{17}"
              value={form.vin}
              onChange={handleChange}
            />
            <Input
              name="year"
              placeholder="Year"
              inputMode="numeric"
              value={form.year}
              onChange={handleChange}
            />
            <Input
              name="make"
              placeholder="Make"
              value={form.make}
              onChange={handleChange}
            />
            <Input
              name="model"
              placeholder="Model"
              value={form.model}
              onChange={handleChange}
            />
            <Input
              name="trailer_type"
              placeholder="Trailer Type"
              value={form.trailer_type}
              onChange={handleChange}
            />
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={adding}>
                {adding ? "Adding..." : "Add Vehicle"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

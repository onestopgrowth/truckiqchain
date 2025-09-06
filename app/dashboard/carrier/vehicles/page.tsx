import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
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
import Link from "next/link";
import { ProfileRequiredToast } from "@/components/profile-required-toast";
import { ShowToastFromSearch } from "@/components/show-toast-from-search";

export const dynamic = "force-dynamic";

async function addVehicle(formData: FormData) {
  "use server";
  const sb = await createServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: carrierProfile } = await sb
    .from("carrier_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!carrierProfile) redirect("/dashboard/carrier/profile");

  await sb.from("carrier_vehicles").insert({
    carrier_profile_id: carrierProfile.id,
    vin: (formData.get("vin") as string)?.trim() || null,
    year: Number(formData.get("year")) || null,
    make: (formData.get("make") as string)?.trim() || null,
    model: (formData.get("model") as string)?.trim() || null,
    trailer_type: (formData.get("trailer_type") as string)?.trim() || null,
  });

  redirect("/dashboard/carrier/vehicles");
}

export default async function VehiclesPage() {
  const sb = await createServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: carrierProfile } = await sb
    .from("carrier_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!carrierProfile) {
    return (
      <div className="container mx-auto p-6 space-y-8">
        <ShowToastFromSearch />
        <ProfileRequiredToast redirectTo="/dashboard/carrier/profile" />
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold">Manage Vehicles</h1>
            <p className="text-muted-foreground">Add and manage your fleet</p>
          </div>
          <Button asChild variant="ghost">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Carrier profile required</CardTitle>
            <CardDescription>
              You need to create your carrier profile before you can manage
              vehicles.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Your carrier profile contains your company info, equipment, and
              documents.
            </p>
            <Button asChild>
              <Link href="/dashboard/carrier/profile">
                Create Carrier Profile
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: vehicles } = await sb
    .from("carrier_vehicles")
    .select("id, vin, year, make, model, trailer_type")
    .eq("carrier_profile_id", carrierProfile.id)
    .order("created_at");

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-3xl font-bold">Manage Vehicles</h1>
          <p className="text-muted-foreground">Add and manage your fleet</p>
        </div>
        <Button asChild variant="ghost">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Fleet Vehicles</CardTitle>
          <CardDescription>Your current inventory</CardDescription>
        </CardHeader>
        <CardContent>
          {!vehicles?.length ? (
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
          <form action={addVehicle} className="grid gap-4 md:grid-cols-2">
            <Input name="vin" placeholder="VIN (17 chars)" pattern=".{17}" />
            <Input name="year" placeholder="Year" inputMode="numeric" />
            <Input name="make" placeholder="Make" />
            <Input name="model" placeholder="Model" />
            <Input name="trailer_type" placeholder="Trailer Type" />
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit">Add Vehicle</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

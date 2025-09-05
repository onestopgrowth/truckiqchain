import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import CarrierAvailabilityForm from "@/components/carrier-availability-form";
import CarrierAvailabilityList from "@/components/carrier-availability-list";

export const dynamic = "force-dynamic";

export default async function AvailabilityPage() {
  const sb = await createServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: carrier } = await sb
    .from("carrier_profiles")
    .select("id,is_verified")
    .eq("user_id", user.id)
    .single();
  if (!carrier) {
    return (
      <div className="p-6 space-y-4">
        <p>No carrier profile found.</p>
        <Link className="underline" href="/dashboard/carrier/profile">
          Create Profile
        </Link>
      </div>
    );
  }
  if (!carrier.is_verified) {
    return (
      <div className="p-6 space-y-4 max-w-xl">
        <h1 className="text-2xl font-semibold">Availability</h1>
        <p className="text-sm text-muted-foreground">
          You must be verified before broadcasting availability.
        </p>
        <Link className="underline text-sm" href="/dashboard">
          Return to Dashboard
        </Link>
      </div>
    );
  }
  const { data: existing } = await sb
    .from("carrier_availability")
    .select("id,start_at,end_at,location,radius_miles,equipment")
    .eq("user_id", user.id)
    .order("start_at", { ascending: false });
  return (
    <div className="max-w-2xl p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Availability</h1>
        <Link className="underline text-sm" href="/dashboard">
          Back
        </Link>
      </div>
      <section>
        <h2 className="text-sm font-semibold mb-2">Create / Update</h2>
        <CarrierAvailabilityForm />
      </section>
      <section>
        <h2 className="text-sm font-semibold mb-2">Existing Windows</h2>
        <CarrierAvailabilityList items={existing || []} />
      </section>
    </div>
  );
}

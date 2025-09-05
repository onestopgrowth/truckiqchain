import { createClient } from "@supabase/supabase-js";

const REQUIRED_DOCS = ["w9", "coi", "authority"];

export async function computeAndMarkCarrierVerified(userId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createClient(url, service, { auth: { persistSession: false } });

  const { data: carrierProfile } = await admin
    .from("carrier_profiles")
    .select("id,is_verified")
    .eq("user_id", userId)
    .single();
  if (!carrierProfile) return { updated: false, reason: "no_carrier_profile" };
  if (carrierProfile.is_verified) return { updated: false, reason: "already" };

  const { data: docs } = await admin
    .from("carrier_documents")
    .select("doc_type,review_status")
    .eq("user_id", userId)
    .in("review_status", ["approved"]);

  const approvedTypes = new Set(
    (docs || []).map((d) => String(d.doc_type).toLowerCase())
  );
  const allMet = REQUIRED_DOCS.every((d) => approvedTypes.has(d));
  if (!allMet) return { updated: false, reason: "missing_docs" };

  const { error: updErr } = await admin
    .from("carrier_profiles")
    .update({ is_verified: true })
    .eq("id", carrierProfile.id);
  if (updErr) return { updated: false, reason: updErr.message };

  // publish event
  await admin
    .from("events")
    .insert({
      event_type: "carrier.verified",
      payload: { user_id: userId, carrier_profile_id: carrierProfile.id },
    });

  return { updated: true };
}

export async function publishAvailabilityBroadcast(
  userId: string,
  carrierProfileId: string,
  availabilityId: string
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createClient(url, service, { auth: { persistSession: false } });
  await admin
    .from("events")
    .insert({
      event_type: "availability.broadcasted",
      payload: {
        user_id: userId,
        carrier_profile_id: carrierProfileId,
        availability_id: availabilityId,
      },
    });
}

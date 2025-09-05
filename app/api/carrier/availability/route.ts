import { NextResponse } from "next/server";
import { createMutableServerClient } from "@/lib/supabase/server-mutable";
import { publishAvailabilityBroadcast } from "@/lib/carrier/verification";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const sb = await createMutableServerClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const body = await req.json();
    const { start_at, end_at, location, radius_miles, equipment } = body;
    if (!start_at || !end_at)
      return NextResponse.json({ error: "missing_time" }, { status: 400 });
    const start = new Date(start_at);
    const end = new Date(end_at);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return NextResponse.json(
        { error: "invalid_time_range" },
        { status: 400 }
      );
    }

    // Fetch carrier profile & verification status
    const { data: carrierProfile } = await sb
      .from("carrier_profiles")
      .select("id,is_verified")
      .eq("user_id", user.id)
      .single();
    if (!carrierProfile)
      return NextResponse.json(
        { error: "no_carrier_profile" },
        { status: 400 }
      );
    if (!carrierProfile.is_verified)
      return NextResponse.json({ error: "not_verified" }, { status: 403 });

    const insertPayload = {
      user_id: user.id,
      carrier_profile_id: carrierProfile.id,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      location: location || null,
      radius_miles: radius_miles ? Number(radius_miles) : null,
      equipment: Array.isArray(equipment)
        ? equipment
        : equipment
        ? [equipment]
        : [],
    };

    const { data, error } = await sb
      .from("carrier_availability")
      .insert(insertPayload)
      .select("id,carrier_profile_id")
      .single();
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    // Publish event
    publishAvailabilityBroadcast(
      user.id,
      data.carrier_profile_id,
      data.id
    ).catch((e) => console.error("availability event failed", e));

    return NextResponse.json({ ok: true, id: data.id });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: "server_error", details: e?.message },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { createMutableServerClient } from "@/lib/supabase/server-mutable";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      carrier_profile_id,
      availability_status,
      location_city,
      location_state,
      radius,
    } = body;
    if (!carrier_profile_id)
      return NextResponse.json({ error: "missing" }, { status: 400 });
    const sb = await createMutableServerClient();
    const { error } = await sb
      .from("carrier_profiles")
      .update({ availability_status, location_city, location_state, radius })
      .eq("id", carrier_profile_id);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

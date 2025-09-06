import { NextResponse } from "next/server";
import { createMutableServerClient } from "@/lib/supabase/server-mutable";
import { notifyBookingRequest } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// POST /api/assignments -> request booking for a load
export async function POST(req: Request) {
  try {
    const sb = await createMutableServerClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    const body = await req.json();
    const { load_id } = body;
    if (!load_id)
      return NextResponse.json({ error: "missing_load_id" }, { status: 400 });

    // fetch carrier profile & verified
    const { data: carrierProfile, error: cpErr } = await sb
      .from("carrier_profiles")
      .select("id,is_verified")
      .eq("user_id", user.id)
      .single();
    if (cpErr || !carrierProfile)
      return NextResponse.json(
        { error: "no_carrier_profile" },
        { status: 400 }
      );
    if (!carrierProfile.is_verified)
      return NextResponse.json({ error: "not_verified" }, { status: 403 });

    // attempt insert
    const { data, error } = await sb
      .from("assignments")
      .insert({
        load_id,
        carrier_user_id: user.id,
        carrier_profile_id: carrierProfile.id,
      })
      .select("id")
      .single();
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
  // best-effort: notify load owner of booking request
  notifyBookingRequest({ loadId: load_id, client: sb as any }).catch(() => {});
    return NextResponse.json({ id: data.id });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

// GET /api/assignments?role=carrier|owner&status=.. -> list assignments relevant to user
export async function GET(req: Request) {
  try {
    const sb = await createMutableServerClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    const url = new URL(req.url);
    const role = url.searchParams.get("role") || "carrier";
    const status = url.searchParams.get("status");
    let query = sb
      .from("assignments")
      .select(
        "id, load_id, status, requested_at, accepted_at, booked_at, in_transit_at, delivered_at, completed_at, declined_at, cancelled_at, pod_file_path"
      );
    if (role === "carrier") {
      query = query.eq("carrier_user_id", user.id);
    } else {
      // owner: join loads
      query = query.in(
        "load_id",
        sb.from("loads").select("id").eq("user_id", user.id) as any
      );
    }
    if (status) query = query.eq("status", status);
    const { data, error } = await query.order("requested_at", {
      ascending: false,
    });
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

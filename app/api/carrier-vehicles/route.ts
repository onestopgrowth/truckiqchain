import { NextResponse } from "next/server";
import { createMutableServerClient } from "@/lib/supabase/server-mutable";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sb = await createMutableServerClient();

    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      console.error("No user found in POST /api/carrier-vehicles");
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    // fetch carrier_profile for current user
    const { data: carrierProfile, error: cpErr } = await sb
      .from("carrier_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (cpErr || !carrierProfile) {
      console.error(
        "No carrier profile found or error:",
        cpErr,
        carrierProfile
      );
      return NextResponse.json(
        { error: "no_carrier_profile" },
        { status: 400 }
      );
    }

    const insert = {
      carrier_profile_id: carrierProfile.id,
      vin: (body.vin as string)?.trim() || null,
      year: body.year ? Number(body.year) : null,
      make: (body.make as string)?.trim() || null,
      model: (body.model as string)?.trim() || null,
      trailer_type: (body.trailer_type as string)?.trim() || null,
    };
    console.log("Inserting vehicle:", insert);

    const { error } = await sb.from("carrier_vehicles").insert(insert);
    if (error) {
      console.error("Error inserting vehicle:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Server error in POST /api/carrier-vehicles:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

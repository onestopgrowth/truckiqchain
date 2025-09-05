import { NextResponse } from "next/server";
import { createMutableServerClient } from "@/lib/supabase/server-mutable";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const sb = await createMutableServerClient();

    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    // confirm vehicle belongs to current user's carrier_profile
    const { data: carrierProfile } = await sb
      .from("carrier_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (!carrierProfile)
      return NextResponse.json(
        { error: "no_carrier_profile" },
        { status: 400 }
      );

    const { error } = await sb
      .from("carrier_vehicles")
      .delete()
      .eq("id", id)
      .eq("carrier_profile_id", carrierProfile.id);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

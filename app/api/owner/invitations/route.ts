import { NextResponse } from "next/server";
import { createMutableServerClient } from "@/lib/supabase/server-mutable";
import { notifyOwnerInvite } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// POST /api/owner/invitations { carrier_user_id, load_id }
// If an invitations table doesn't exist, fall back to creating an assignment in requested status for the carrier.
export async function POST(req: Request) {
  try {
    const sb = await createMutableServerClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      console.error("[INVITE] No user in session");
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    const body = await req.json();
    const { carrier_user_id, load_id } = body || {};
    console.log("[INVITE] Incoming payload", body);
    if (!carrier_user_id || !load_id) {
      console.error("[INVITE] Missing fields", { carrier_user_id, load_id });
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    // Verify load belongs to current user
    const { data: load, error: loadErr } = await sb
      .from("loads")
      .select("id,user_id,status")
      .eq("id", load_id)
      .single();
    console.log("[INVITE] Load query result", { load, loadErr });
    if (loadErr) console.error("[INVITE] Load fetch error", loadErr);
    if (!load || load.user_id !== user.id) {
      console.error("[INVITE] Forbidden: load not found or not owned", { load, userId: user.id });
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // Preferred: directly create an assignment in requested status (owner-initiated)
    // Need the carrier profile id
    const { data: cp, error: cpErr } = await sb
      .from("carrier_profiles")
      .select("id")
      .eq("user_id", carrier_user_id)
      .maybeSingle();
    console.log("[INVITE] Carrier profile query result", { cp, cpErr });
    if (cpErr) {
      console.error("[INVITE] Carrier profile fetch error", cpErr);
      return NextResponse.json({ error: cpErr.message }, { status: 400 });
    }
    if (!cp) {
      console.error("[INVITE] Carrier profile missing", { carrier_user_id });
      return NextResponse.json(
        { error: "carrier_profile_missing" },
        { status: 400 }
      );
    }
    const { error: asgErr } = await sb
      .from("assignments")
      .insert({
        load_id,
        carrier_user_id,
        carrier_profile_id: cp.id,
        status: "requested",
  assignment_type: "owner_invite",
      });
    if (asgErr) {
      console.error("[INVITE] Assignment insert error", asgErr);
    }
    if (!asgErr) {
      // fire-and-forget notification to carrier
      notifyOwnerInvite({ carrierUserId: carrier_user_id, loadId: load_id, client: sb as any }).catch(
        (e) => console.error("[INVITE] Notification error", e)
      );
      return NextResponse.json({ ok: true, via: "assignments" });
    }

    // Optional: if an invitations table exists and you prefer a pre-assignment invitation, try it as a fallback
    const { error: invErr } = await sb
      .from("invitations" as any)
      .insert({
        load_id,
        owner_user_id: user.id,
        carrier_user_id,
        status: "sent",
      } as any);
    if (!invErr) return NextResponse.json({ ok: true, via: "invitations" });
    return NextResponse.json(
      { error: asgErr?.message || "invite_failed" },
      { status: 400 }
    );
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

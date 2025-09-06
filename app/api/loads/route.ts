import { NextResponse } from "next/server";
import { createMutableServerClient } from "@/lib/supabase/server-mutable";

export const dynamic = "force-dynamic";

// POST /api/loads - create new load posting
export async function POST(req: Request) {
  try {
    const sb = await createMutableServerClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    const body = await req.json();

    if (!body.title || String(body.title).trim().length === 0) {
      return NextResponse.json({ error: "title_required" }, { status: 400 });
    }

    const insert = {
      user_id: user.id,
      title: body.title || null,
      reference_number: body.reference_number || null,
      origin_city: body.origin_city,
      origin_state: body.origin_state,
      origin_zip: body.origin_zip || null,
      destination_city: body.destination_city,
      destination_state: body.destination_state,
      destination_zip: body.destination_zip || null,
      pickup_earliest: body.pickup_earliest || null,
      pickup_latest: body.pickup_latest || null,
      delivery_earliest: body.delivery_earliest || null,
      delivery_latest: body.delivery_latest || null,
      equipment_required: Array.isArray(body.equipment_required)
        ? body.equipment_required
        : body.equipment_required
        ? [body.equipment_required]
        : [],
      weight_lbs: body.weight_lbs ? Number(body.weight_lbs) : null,
      pieces: body.pieces ? Number(body.pieces) : null,
      length_feet: body.length_feet ? Number(body.length_feet) : null,
      notes: body.notes || null,
    } as any;

    // Insert without selecting the row back to avoid triggering SELECT RLS policies
    const { error } = await sb.from("loads").insert(insert);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

// GET /api/loads - list own loads (optionally filter by status)
export async function GET(req: Request) {
  try {
    const sb = await createMutableServerClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const url = new URL(req.url);
    const status = url.searchParams.get("status");

    let query = sb
      .from("loads")
      .select(
        "id, title, origin_city, origin_state, destination_city, destination_state, status, pickup_earliest, pickup_latest, weight_lbs, equipment_required, created_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

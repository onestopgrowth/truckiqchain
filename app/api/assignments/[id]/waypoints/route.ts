import { NextResponse } from "next/server";
import { createMutableServerClient } from "@/lib/supabase/server-mutable";

export const dynamic = "force-dynamic";

// GET /api/assignments/:id/waypoints -> list
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sb = await createMutableServerClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    const { data: a, error } = await sb
      .from("assignments")
      .select("id, load_id, carrier_user_id")
      .eq("id", params.id)
      .single();
    if (error || !a)
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    const { data: l } = await sb
      .from("loads")
      .select("user_id")
      .eq("id", a.load_id)
      .single();
    if (a.carrier_user_id !== user.id && l?.user_id !== user.id)
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const { data, error: wErr } = await sb
      .from("assignment_waypoints")
      .select("id,recorded_at,lat,lon,note")
      .eq("assignment_id", params.id)
      .order("recorded_at", { ascending: false });
    if (wErr)
      return NextResponse.json({ error: wErr.message }, { status: 400 });
    return NextResponse.json({ data });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

// POST /api/assignments/:id/waypoints { lat, lon, note }
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sb = await createMutableServerClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const { lat, lon, note } = body || {};
    const { data: a, error } = await sb
      .from("assignments")
      .select("id, load_id, carrier_user_id")
      .eq("id", params.id)
      .single();
    if (error || !a)
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    const { data: l } = await sb
      .from("loads")
      .select("user_id")
      .eq("id", a.load_id)
      .single();
    if (a.carrier_user_id !== user.id && l?.user_id !== user.id)
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const ins = await sb
      .from("assignment_waypoints")
      .insert({
        assignment_id: params.id,
        lat: lat ?? null,
        lon: lon ?? null,
        note: note ?? null,
      });
    if (ins.error)
      return NextResponse.json({ error: ins.error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

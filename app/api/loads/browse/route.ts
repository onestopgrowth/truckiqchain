import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/loads/browse?origin_state=..&destination_state=..&equipment=dry_van,reefer
export async function GET(req: Request) {
  try {
    const sb = await createServerClient(); // RLS enforced client
    const url = new URL(req.url);
    const origin_state = url.searchParams.get("origin_state");
    const destination_state = url.searchParams.get("destination_state");
    const equipment = url.searchParams.get("equipment"); // comma list

    let query = sb
      .from("loads")
      .select(
        "id, title, origin_city, origin_state, destination_city, destination_state, pickup_earliest, pickup_latest, weight_lbs, equipment_required, created_at"
      )
      .eq("status", "open");

    if (origin_state) query = query.ilike("origin_state", origin_state);
    if (destination_state)
      query = query.ilike("destination_state", destination_state);
    if (equipment) {
      const list = equipment
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (list.length) {
        // overlap operator available via PostgREST filter; Supabase JS: .overlaps
        query = query.overlaps("equipment_required", list as any);
      }
    }

    const { data, error } = await query.limit(100);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ data });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

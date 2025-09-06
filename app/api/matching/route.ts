import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { computeMatchScore } from "@/lib/matching/score";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const sb = await createServerClient();
    const url = new URL(req.url);
    const loadId = url.searchParams.get("load_id");
    if (!loadId)
      return NextResponse.json({ error: "missing_load_id" }, { status: 400 });

    const { data: load, error: loadErr } = await sb
      .from("loads")
      .select(
        "id,origin_state,origin_city,destination_state,destination_city,equipment_required"
      )
      .eq("id", loadId)
      .single();
    if (loadErr || !load)
      return NextResponse.json({ error: "load_not_found" }, { status: 404 });

    // get active availability windows (simple filter: end_at in future)
    const { data: avails, error: availErr } = await sb
      .from("carrier_availability")
      .select("id,user_id,carrier_profile_id,equipment,start_at,end_at")
      .gt("end_at", new Date().toISOString())
      .limit(200);
    if (availErr)
      return NextResponse.json({ error: availErr.message }, { status: 500 });

    const scored = (avails || []).map((a) => ({
      ...a,
      score: computeMatchScore(load as any, a as any),
    }));
    scored.sort((a, b) => b.score - a.score);

    return NextResponse.json({ load_id: loadId, matches: scored.slice(0, 50) });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

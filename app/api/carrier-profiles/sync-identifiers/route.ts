import { NextResponse } from "next/server";
import { createMutableServerClient } from "@/lib/supabase/server-mutable";

export const dynamic = "force-dynamic";

// POST /api/carrier-profiles/sync-identifiers -> copies dot/mc from profiles into carrier_profiles
export async function POST() {
  try {
    const sb = await createMutableServerClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

    const { data: prof } = await sb.from('profiles').select('dot_number, mc_number').eq('id', user.id).single();
    if (!prof) return NextResponse.json({ error: 'profile_missing' }, { status: 400 });

    const { data: cp } = await sb.from('carrier_profiles').select('id').eq('user_id', user.id).maybeSingle();
    if (!cp) return NextResponse.json({ error: 'carrier_profile_missing' }, { status: 400 });

    const update: any = {};
    if (prof.dot_number) update.dot_number = prof.dot_number;
    if (prof.mc_number) update.mc_number = prof.mc_number;
    if (!Object.keys(update).length) return NextResponse.json({ ok: true, skipped: true });

    const { error } = await sb.from('carrier_profiles').update(update).eq('id', cp.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

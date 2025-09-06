import { NextResponse } from "next/server";
import { createMutableServerClient } from "@/lib/supabase/server-mutable";
import { notifyLoadCancelled } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// PATCH /api/loads/:id/status { action: 'cancel' }
export async function PATCH(
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
    const action = body.action as string;
    if (action !== "cancel")
      return NextResponse.json({ error: "invalid_action" }, { status: 400 });

    // Ensure load belongs to user and is open
    const { data: load, error } = await sb
      .from("loads")
      .select("id,status")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();
    if (error || !load)
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (load.status !== "open")
      return NextResponse.json({ error: "not_open" }, { status: 400 });

  const { error: upErr } = await sb
      .from("loads")
      .update({ status: "cancelled" })
      .eq("id", params.id);
    if (upErr)
      return NextResponse.json({ error: upErr.message }, { status: 400 });
  // best-effort email carriers with active assignments
  notifyLoadCancelled({ loadId: params.id, client: sb as any }).catch(() => {});
    return NextResponse.json({ ok: true, status: "cancelled" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createMutableServerClient } from "@/lib/supabase/server-mutable";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { review_status } = body;
    if (!["approved", "rejected", "pending"].includes(review_status)) {
      return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }

    const sb = await createMutableServerClient();

    // naive authorization: rely on DB policy (we created an admin check in migration)
    const { error } = await sb
      .from("carrier_documents")
      .update({ review_status })
      .eq("id", id);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createMutableServerClient } from "@/lib/supabase/server-mutable";

const REQUIRED_DOC_TYPES = ["w9", "coi", "authority"]; // must all be approved before availability_status can be 'available'

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sb = await createMutableServerClient();
    const { id } = body;
    // Guard: only when setting availability_status to 'available'
    if (body?.availability_status === "available" && body?.user_id) {
      // check current status to avoid blocking initial profile creation where it's already available (we coerce on client, but double-check)
      const { data: current } = await sb
        .from("carrier_profiles")
        .select("availability_status")
        .eq("user_id", body.user_id)
        .maybeSingle();
      const alreadyAvailable = current?.availability_status === "available";
      const changingToAvailable = !alreadyAvailable;
      if (changingToAvailable) {
        const { data: docs, error: docsErr } = await sb
          .from("carrier_documents")
          .select("doc_type,review_status")
          .eq("user_id", body.user_id)
          .in("doc_type", REQUIRED_DOC_TYPES)
          .in("review_status", ["approved"]);
        if (docsErr)
          return NextResponse.json({ error: docsErr.message }, { status: 500 });
        const approved = new Set(
          (docs || []).map((d: any) => String(d.doc_type).toLowerCase())
        );
        const allMet = REQUIRED_DOC_TYPES.every((d) => approved.has(d));
        if (!allMet) {
          return NextResponse.json(
            {
              error: "incomplete_documents",
              message:
                "You must have approved W-9, COI, and Operating Authority before setting status to Available.",
            },
            { status: 400 }
          );
        }
      }
    }

    if (id) {
      const { error } = await sb
        .from("carrier_profiles")
        .update(body)
        .eq("id", id);
      if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    } else {
      const { error } = await sb.from("carrier_profiles").insert(body);
      if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

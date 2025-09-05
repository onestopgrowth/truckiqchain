import { NextResponse } from "next/server";
import { createMutableServerClient } from "@/lib/supabase/server-mutable";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sb = await createMutableServerClient();
    const { id } = body;
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

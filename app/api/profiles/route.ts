import { NextResponse } from "next/server";
import { createMutableServerClient } from "@/lib/supabase/server-mutable";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, role, company_name } = body;
    if (!id || !role)
      return NextResponse.json({ error: "missing" }, { status: 400 });

    const sb = await createMutableServerClient();
    const { data: userRes } = await sb.auth.getUser();
    const email = userRes?.user?.email || body?.email;
    if (!email) {
      return NextResponse.json(
        { error: "email_required" },
        { status: 400 }
      );
    }

    const { error } = await sb
      .from("profiles")
      .upsert({ id, role, company_name, email }, { onConflict: "id" });
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

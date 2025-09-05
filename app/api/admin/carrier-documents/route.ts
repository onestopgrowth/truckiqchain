import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Validate service role env
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return NextResponse.json(
        {
          error:
            "Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL",
        },
        { status: 500 }
      );
    }

    // Check current user & role via standard server client (RLS-respecting)
    const rlsClient = await createServerClient();
    const {
      data: { user },
      error: userErr,
    } = await rlsClient.auth.getUser();
    if (userErr)
      return NextResponse.json({ error: userErr.message }, { status: 401 });
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile, error: profileErr } = await rlsClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profileErr)
      return NextResponse.json({ error: profileErr.message }, { status: 500 });

    const adminByEmail =
      user.email === "zenteklabsjohnboy@gmail.com" ||
      String(process.env.ADMIN_BYPASS_EMAIL ?? "")
        .split(",")
        .map((s) => s.trim())
        .includes(user.email || "");

    if (profile?.role !== "admin" && !adminByEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Use service role to bypass RLS once authorized.
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });
    const { data, error } = await sb
      .from("carrier_documents")
      .select(
        `id, user_id, carrier_profile_id, doc_type, file_name, file_path, file_hash, review_status, created_at,
        profiles:profiles(id,company_name,role), carrier_profiles:carrier_profiles(id,dot_number)`
      )
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return NextResponse.json(
      { error: "Service role or URL not configured" },
      { status: 500 }
    );
  }

  let body: { company_name?: string; dot_number?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { company_name, dot_number } = body;
  if (!company_name && !dot_number) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    // Verify admin privileges via normal (RLS) client
    const rls = await createServerClient();
    const {
      data: { user },
      error: userErr,
    } = await rls.auth.getUser();
    if (userErr)
      return NextResponse.json({ error: userErr.message }, { status: 401 });
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: prof, error: profErr } = await rls
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const adminByEmail =
      user.email === "zenteklabsjohnboy@gmail.com" ||
      String(process.env.ADMIN_BYPASS_EMAIL ?? "")
        .split(",")
        .map((s) => s.trim())
        .includes(user.email || "");
    if (profErr)
      return NextResponse.json({ error: profErr.message }, { status: 500 });
    if (prof?.role !== "admin" && !adminByEmail)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Service role client for unrestricted updates
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    // Fetch carrier profile to get user_id
    const { data: carrierProfile, error: cpErr } = await admin
      .from("carrier_profiles")
      .select("id,user_id,dot_number")
      .eq("id", id)
      .single();
    if (cpErr)
      return NextResponse.json({ error: cpErr.message }, { status: 404 });

    const updates: Record<string, any> = {};
    if (dot_number) updates.dot_number = dot_number;

    if (Object.keys(updates).length) {
      const { error: updErr } = await admin
        .from("carrier_profiles")
        .update(updates)
        .eq("id", id);
      if (updErr)
        return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    if (company_name) {
      const { error: profUpdErr } = await admin
        .from("profiles")
        .update({ company_name })
        .eq("id", carrierProfile.user_id);
      if (profUpdErr)
        return NextResponse.json(
          { error: profUpdErr.message },
          { status: 500 }
        );
    }

    // Return refreshed data
    const { data: updatedCarrier, error: refErr } = await admin
      .from("carrier_profiles")
      .select("id,user_id,dot_number")
      .eq("id", id)
      .single();
    const { data: relatedProfile } = await admin
      .from("profiles")
      .select("id,company_name")
      .eq("id", carrierProfile.user_id)
      .single();

    if (refErr)
      return NextResponse.json({ error: refErr.message }, { status: 500 });

    return NextResponse.json({
      data: { carrier_profile: updatedCarrier, profile: relatedProfile },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}

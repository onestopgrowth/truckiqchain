import { NextResponse } from "next/server";
import { createMutableServerClient } from "@/lib/supabase/server-mutable";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const formData = await req.formData();
  const role = formData.get("role");
  if (role !== "carrier" && role !== "capacity_finder") {
    return NextResponse.redirect(
      new URL("/onboarding/role?error=invalid", req.url)
    );
  }

  const sb = await createMutableServerClient();
  const {
    data: { user },
    error: userError,
  } = await sb.auth.getUser();
  if (!user || userError) {
    console.error("User fetch error:", userError);
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  // Ensure email included to satisfy NOT NULL on first insert
  let userEmail = (user as any)?.email;
  if (!userEmail) {
    // Try to fetch from profile if not present
    const { data: userProfile, error: profileError } = await sb
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) {
      console.error("Profile fetch error:", profileError);
    }
    userEmail = userProfile?.email || null;
  }
  if (!userEmail) {
    console.error("No email found for user", user.id);
    return NextResponse.redirect(
      new URL("/onboarding/role?error=no_email", req.url)
    );
  }

  const { error: upsertError } = await sb
    .from("profiles")
    .upsert({ id: user.id, role, email: userEmail }, { onConflict: "id" });
  if (upsertError) {
    console.error("Upsert error:", upsertError);
    return NextResponse.redirect(
      new URL("/onboarding/role?error=save", req.url)
    );
  }

  // Redirect carriers to unified carrier profile page
  const dest = role === "carrier" ? "/dashboard/carrier/profile" : "/dashboard";
  return NextResponse.redirect(new URL(dest, req.url));
}

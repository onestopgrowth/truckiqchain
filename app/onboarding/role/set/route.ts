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
  } = await sb.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/auth/login", req.url));

  // Ensure email included to satisfy NOT NULL on first insert
  const { data: userProfile } = await sb
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
    const userEmail = (user as any)?.email || (userProfile as any)?.email || null;
  const { error } = await sb
    .from("profiles")
    .upsert(
        { id: user.id, role, email: userEmail },
      { onConflict: "id" }
    );
  if (error) {
    console.error(error);
    return NextResponse.redirect(
      new URL("/onboarding/role?error=save", req.url)
    );
  }

  // Redirect carriers to unified carrier profile page
  const dest = role === "carrier" ? "/dashboard/carrier/profile" : "/dashboard";
  return NextResponse.redirect(new URL(dest, req.url));
}

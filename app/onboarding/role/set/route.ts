import { NextResponse } from "next/server";
import { createMutableServerClient } from "@/lib/supabase/server";

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

  const sb = createMutableServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/auth/login", req.url));

  const { error } = await sb
    .from("profiles")
    .upsert({ id: user.id, role }, { onConflict: "id" });
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

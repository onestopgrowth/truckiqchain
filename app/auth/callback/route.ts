// ...existing code...
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Session } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const store = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll().map((c) => ({ name: c.name, value: c.value })),
        setAll: (arr: { name: string; value: string; options?: any }[]) =>
          arr.forEach((c) =>
            store.set({
              name: c.name,
              value: c.value,
              path: "/",
              httpOnly: true,
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
              ...c.options,
            })
          ),
      },
    }
  );

  const url = new URL(req.url);
  try {
    // Supabase will call back with a code; exchange it for a session and persist cookies
    const { error } = await supabase.auth.exchangeCodeForSession(url.toString() as any);
    if (error) {
      console.error("exchangeCodeForSession error", error.message);
      return NextResponse.redirect(new URL("/auth/login?error=confirmation_failed", req.url));
    }
    return NextResponse.redirect(new URL("/dashboard", req.url));
  } catch (e: any) {
    console.error("auth callback GET error", e?.message || e);
    return NextResponse.redirect(new URL("/auth/login?error=callback_error", req.url));
  }
}

export async function POST(req: Request) {
  const { event, session }: { event: string; session: Session | null } =
    await req.json();
  const store = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () =>
          store.getAll().map((c) => ({ name: c.name, value: c.value })),
        setAll: (arr: { name: string; value: string; options?: any }[]) =>
          arr.forEach((c) =>
            store.set({
              name: c.name,
              value: c.value,
              path: "/",
              httpOnly: true,
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
              ...c.options,
            })
          ),
      },
    }
  );

  if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
    await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
  } else if (event === "SIGNED_OUT") {
    await supabase.auth.signOut();
  }

  return NextResponse.json({ ok: true });
}

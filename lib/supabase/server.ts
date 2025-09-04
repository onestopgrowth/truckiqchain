import { cookies } from "next/headers";
import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";

// Read-only client (Server Components)
export async function createServerClient() {
  const cookieStore = await cookies(); // TS expects Promise in your setup
  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // No set/remove here (readonly environment)
        set() {},
        remove() {},
      },
    }
  );
}

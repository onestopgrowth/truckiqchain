import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function createMutableServerClient() {
  const store = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () =>
          store.getAll().map(c => ({ name: c.name, value: c.value })),
        setAll: (all) => {
          all.forEach(c =>
            store.set({
              name: c.name,
              value: c.value,
              path: "/",
              httpOnly: true,
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
            })
          );
        },
      },
    }
  );
}
import { cookies } from "next/headers";
import { createServerClient as createServerClientLib } from "@supabase/ssr";

export async function createServerClient() {
  const store = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) throw new Error("Missing Supabase env vars");

  return createServerClientLib(url, anon, {
    cookies: {
      getAll() {
        return store.getAll().map((c) => ({ name: c.name, value: c.value }));
      },
      setAll(list: { name: string; value: string; options?: any }[]) {
        list.forEach((c) =>
          store.set({
            name: c.name,
            value: c.value,
            path: "/",
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            ...c.options,
          })
        );
      },
    },
  });
}

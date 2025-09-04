import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

function isAuth(name: string) {
  return name.startsWith("sb-") || name.includes("auth-token");
}

async function doLogout(req: Request) {
  const store = await cookies(); // Next 15 needs await
  for (const c of store.getAll()) {
    if (isAuth(c.name)) {
      store.set({
        name: c.name,
        value: "",
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 0,
      });
    }
  }
  return NextResponse.redirect(new URL("/auth/login", req.url), {
    status: 303,
  });
}

export async function POST(req: Request) {
  return doLogout(req);
}
export async function GET(req: Request) {
  return doLogout(req);
}

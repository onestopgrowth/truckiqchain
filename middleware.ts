import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/dashboard"];

function isProtected(path: string) {
  return PROTECTED.some((base) => path === base || path.startsWith(base + "/"));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = req.cookies
    .getAll()
    .some((c) => c.name.includes("-auth-token"));

  if (isProtected(pathname) && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/auth/login") && hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/auth/:path*"],
};

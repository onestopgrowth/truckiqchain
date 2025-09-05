import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/dashboard"];

function isProtected(path: string) {
  return PROTECTED.some((base) => path === base || path.startsWith(base + "/"));
}

// naive in-memory rate limiter (per process) - suitable for dev only
const rlMap: Record<string, { count: number; ts: number }> = {};
const WINDOW_MS = 60_000; // 1 minute
const MAX_REQ = 60; // per IP per window

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

  // Rate limit selected API mutation routes
  if (pathname.startsWith('/api/') && req.method !== 'GET') {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anon';
    const key = `${ip}`;
    const now = Date.now();
    const entry = rlMap[key] || { count: 0, ts: now };
    if (now - entry.ts > WINDOW_MS) {
      entry.count = 0; entry.ts = now;
    }
    entry.count += 1;
    rlMap[key] = entry;
    if (entry.count > MAX_REQ) {
      return new NextResponse(JSON.stringify({ error: 'rate_limited' }), { status: 429, headers: { 'Content-Type': 'application/json' } });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/auth/:path*"],
};

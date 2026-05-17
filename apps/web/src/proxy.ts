import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/request-auth";

const protectedPrefixes = ["/admin", "/api/chat", "/api/platform", "/api/auth/me", "/api/auth/logout"];

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isApiPath(pathname: string) {
  return pathname.startsWith("/api/");
}

function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const result = await requireAdminSession(request.headers.get("cookie"));

  if (result.ok) {
    return NextResponse.next();
  }

  if (isApiPath(pathname)) {
    return jsonError(result.status, result.error);
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  if (result.status === 403) {
    loginUrl.searchParams.set("error", "forbidden");
  }

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/chat/:path*", "/api/platform/:path*", "/api/auth/me", "/api/auth/logout"]
};

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPaths = ["/", "/api/chat"];

export function proxy(request: NextRequest) {
  const gateEnabled = process.env.NEXT_PUBLIC_API_GATE_ENABLED !== "false";
  const isProtected = protectedPaths.some((path) =>
    request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(`${path}/`)
  );

  if (!gateEnabled || !isProtected) {
    return NextResponse.next();
  }

  const username = process.env.APP_GATE_USERNAME;
  const password = process.env.APP_GATE_PASSWORD;
  const header = request.headers.get("authorization");

  if (!username || !password) {
    return new NextResponse("Missing gate configuration.", { status: 500 });
  }

  if (!header?.startsWith("Basic ")) {
    return new NextResponse("Authentication required.", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Neutrino Preview"'
      }
    });
  }

  const decoded = atob(header.slice("Basic ".length));
  const [providedUsername, providedPassword] = decoded.split(":");

  if (providedUsername !== username || providedPassword !== password) {
    return new NextResponse("Invalid credentials.", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Neutrino Preview"'
      }
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/api/chat"]
};

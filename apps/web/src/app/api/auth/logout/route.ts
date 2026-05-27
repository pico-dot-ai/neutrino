import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { getAuthPolicyEnv } from "@/lib/config";

export async function POST(request: Request) {
  const authEnv = getAuthPolicyEnv();
  const response = NextResponse.json({ ok: true });

  if (
    authEnv.AUTH_PROVIDER === "ory-kratos" &&
    authEnv.ORY_KRATOS_PUBLIC_URL
  ) {
    const returnTo = new URL("/login", request.url).toString();
    const logoutUrl = new URL(
      authEnv.ORY_KRATOS_BROWSER_LOGOUT_PATH,
      authEnv.ORY_KRATOS_PUBLIC_URL
    );
    logoutUrl.searchParams.set("return_to", returnTo);
    response.headers.set("x-neutrino-logout-url", logoutUrl.toString());
  }

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });

  return response;
}

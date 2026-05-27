import { NextResponse } from "next/server";
import { getAuthPolicyEnv } from "@/lib/config";

function sanitizeNext(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/admin";
  }
  return next;
}

export async function GET(request: Request) {
  const authEnv = getAuthPolicyEnv();
  const next = sanitizeNext(new URL(request.url).searchParams.get("next"));

  if (authEnv.AUTH_PROVIDER === "local") {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", next);
    return NextResponse.redirect(loginUrl);
  }

  if (!authEnv.ORY_KRATOS_PUBLIC_URL) {
    return NextResponse.json(
      { error: "Missing ORY_KRATOS_PUBLIC_URL for hosted identity login." },
      { status: 500 }
    );
  }

  const returnTo = new URL(next, request.url).toString();
  const kratosLoginUrl = new URL(
    authEnv.ORY_KRATOS_BROWSER_LOGIN_PATH,
    authEnv.ORY_KRATOS_PUBLIC_URL
  );
  kratosLoginUrl.searchParams.set("return_to", returnTo);

  return NextResponse.redirect(kratosLoginUrl);
}

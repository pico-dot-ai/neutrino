import { NextResponse } from "next/server";
import { getAuthPolicyEnv } from "@/lib/config";

export type HostedBrowserFlowKind =
  | "login"
  | "registration"
  | "recovery"
  | "verification"
  | "settings";

const localRouteByKind: Record<HostedBrowserFlowKind, string> = {
  login: "/login",
  registration: "/signup",
  recovery: "/recovery",
  verification: "/verification",
  settings: "/settings"
};

function getHostedBrowserFlowPath(
  authEnv: ReturnType<typeof getAuthPolicyEnv>,
  kind: HostedBrowserFlowKind
) {
  switch (kind) {
    case "login":
      return authEnv.ORY_KRATOS_BROWSER_LOGIN_PATH;
    case "registration":
      return authEnv.ORY_KRATOS_BROWSER_REGISTRATION_PATH;
    case "recovery":
      return authEnv.ORY_KRATOS_BROWSER_RECOVERY_PATH;
    case "verification":
      return authEnv.ORY_KRATOS_BROWSER_VERIFICATION_PATH;
    case "settings":
      return authEnv.ORY_KRATOS_BROWSER_SETTINGS_PATH;
  }
}

function sanitizeNext(next: string | null, fallback: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return fallback;
  }

  return next;
}

export function startBrowserFlow(
  request: Request,
  kind: HostedBrowserFlowKind,
  options?: {
    allowNext?: boolean;
    fallbackNext?: string;
  }
) {
  const authEnv = getAuthPolicyEnv();
  const allowNext = options?.allowNext ?? false;
  const fallbackNext = options?.fallbackNext ?? "/admin";
  const next = sanitizeNext(new URL(request.url).searchParams.get("next"), fallbackNext);

  if (authEnv.AUTH_PROVIDER === "local") {
    const redirectUrl = new URL(localRouteByKind[kind], request.url);
    if (allowNext) {
      redirectUrl.searchParams.set("next", next);
    }
    return NextResponse.redirect(redirectUrl);
  }

  if (!authEnv.ORY_KRATOS_PUBLIC_URL) {
    return NextResponse.json(
      { error: "Missing ORY_KRATOS_PUBLIC_URL for hosted identity flow." },
      { status: 500 }
    );
  }

  const flowUrl = new URL(
    getHostedBrowserFlowPath(authEnv, kind),
    authEnv.ORY_KRATOS_PUBLIC_URL
  );

  if (allowNext) {
    flowUrl.searchParams.set("return_to", new URL(next, request.url).toString());
  }

  return NextResponse.redirect(flowUrl);
}

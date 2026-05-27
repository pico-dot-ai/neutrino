import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateLocalIdentity } from "@/lib/auth/identity";
import { isEligibleAdminActor } from "@/lib/auth/policy";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { issueAdminSession } from "@/lib/auth/session";
import { getAuthPolicyEnv } from "@/lib/config";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  next: z.string().optional()
});

function sanitizeNext(next: string | undefined) {
  if (!next || !next.startsWith("/")) {
    return "/admin";
  }

  if (next.startsWith("//")) {
    return "/admin";
  }

  return next;
}

export async function POST(request: Request) {
  const authEnv = getAuthPolicyEnv();
  if (authEnv.AUTH_PROVIDER !== "local") {
    return NextResponse.json(
      { error: "Local credential login is disabled for hosted identity mode." },
      { status: 400 }
    );
  }
  if (process.env.NODE_ENV === "production" && authEnv.AUTH_LOCAL_MODE !== "emergency") {
    return NextResponse.json(
      { error: "Local credential login is disabled outside emergency fallback mode." },
      { status: 400 }
    );
  }

  try {
    const payload = loginSchema.parse(await request.json());
    const actor = await authenticateLocalIdentity({
      username: payload.username,
      password: payload.password
    });

    if (!actor) {
      return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    }

    if (!isEligibleAdminActor(actor)) {
      return NextResponse.json(
        { error: "App admin privileges are required for this console." },
        { status: 403 }
      );
    }

    const token = await issueAdminSession(actor);
    const response = NextResponse.json({ ok: true, redirectTo: sanitizeNext(payload.next) });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid login payload." }, { status: 400 });
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to process login request."
      },
      { status: 500 }
    );
  }
}

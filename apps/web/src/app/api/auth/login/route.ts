import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateLocalIdentity } from "@/lib/auth/identity";
import { isEligibleAdminPrincipal } from "@/lib/auth/policy";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { issueAdminSession } from "@/lib/auth/session";

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
  try {
    const payload = loginSchema.parse(await request.json());
    const principal = await authenticateLocalIdentity({
      username: payload.username,
      password: payload.password
    });

    if (!principal) {
      return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    }

    if (!isEligibleAdminPrincipal(principal)) {
      return NextResponse.json(
        { error: "App admin privileges are required for this console." },
        { status: 403 }
      );
    }

    const token = await issueAdminSession(principal);
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

import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/request-auth";

export async function GET(request: Request) {
  const adminResult = await requireAdminSession(request.headers.get("cookie"));
  if (!adminResult.ok) {
    return NextResponse.json({ error: adminResult.error }, { status: adminResult.status });
  }

  return NextResponse.json({
    actor: adminResult.session.actor,
    issuedAt: adminResult.session.issuedAt,
    expiresAt: adminResult.session.expiresAt
  });
}

import { NextResponse } from "next/server";
import { getProxyEnv } from "@/lib/config";
import { requireAdminSession } from "@/lib/auth/request-auth";

export async function POST(
  request: Request,
  context: { params: Promise<{ appId: string; actionId: string }> }
) {
  const auth = await requireAdminSession(request.headers.get("cookie"));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const proxyEnv = getProxyEnv();
  const { appId, actionId } = await context.params;
  const upstream = await fetch(
    `${proxyEnv.API_BASE_URL}/v1/apps/${encodeURIComponent(appId)}/actions/${encodeURIComponent(actionId)}/invoke`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-proxy-secret": proxyEnv.API_PROXY_SHARED_SECRET,
        "x-pico-admin-email": auth.session.actor.email,
        "x-pico-admin-actor-id": auth.session.actor.actorId,
        "x-pico-admin-groups": auth.session.actor.groups.join(",")
      },
      body: await request.text()
    }
  );

  const payload = (await upstream.json().catch(() => ({
    error: "Unable to parse action invocation response."
  }))) as unknown;
  return NextResponse.json(payload, { status: upstream.status });
}

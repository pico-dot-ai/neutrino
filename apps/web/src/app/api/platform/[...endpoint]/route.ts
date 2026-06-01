import { NextResponse } from "next/server";
import { getProxyEnv } from "@/lib/config";
import { requireAdminSession } from "@/lib/auth/request-auth";

async function forwardToControlPlane(request: Request, endpoint: string[]) {
  const auth = await requireAdminSession(request.headers.get("cookie"));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const proxyEnv = getProxyEnv();
  const requestUrl = new URL(request.url);
  const upstreamUrl = new URL(
    `${proxyEnv.API_BASE_URL}/v1/control-plane/${endpoint.join("/")}`
  );
  upstreamUrl.search = requestUrl.search;

  const upstream = await fetch(upstreamUrl, {
    method: request.method,
    headers: {
      "Content-Type": "application/json",
      "x-api-proxy-secret": proxyEnv.API_PROXY_SHARED_SECRET,
      "x-pico-admin-email": auth.session.actor.email,
      "x-pico-admin-actor-id": auth.session.actor.actorId
    },
    body:
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.text()
  });

  const contentType = upstream.headers.get("content-type") ?? "application/json";
  if (contentType.includes("application/json")) {
    const payload = (await upstream.json().catch(() => ({
      error: "Unable to parse control-plane response."
    }))) as unknown;
    return NextResponse.json(payload, { status: upstream.status });
  }

  return new NextResponse(await upstream.text(), {
    status: upstream.status,
    headers: {
      "Content-Type": contentType
    }
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ endpoint: string[] }> }
) {
  const { endpoint } = await context.params;
  return forwardToControlPlane(request, endpoint);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ endpoint: string[] }> }
) {
  const { endpoint } = await context.params;
  return forwardToControlPlane(request, endpoint);
}

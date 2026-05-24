import { NextResponse } from "next/server";
import { z } from "zod";
import { getProxyEnv } from "@/lib/config";
import { requireAdminSession } from "@/lib/auth/request-auth";

const requestSchema = z.object({
  runtime: z
    .object({
      workspaceId: z.string().min(1).optional(),
      projectId: z.string().min(1).optional(),
      agentId: z.string().min(1).optional()
    })
    .optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string().min(1)
      })
    )
    .min(1)
});

export async function POST(request: Request) {
  try {
    const adminResult = await requireAdminSession(request.headers.get("cookie"));
    if (!adminResult.ok) {
      return NextResponse.json(
        { error: adminResult.error },
        { status: adminResult.status }
      );
    }

    const proxyEnv = getProxyEnv();
    const payload = requestSchema.parse(await request.json());
    const upstreamUrl = `${proxyEnv.API_BASE_URL}/v1/chat`;
    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-proxy-secret": proxyEnv.API_PROXY_SHARED_SECRET
      },
      body: JSON.stringify(payload)
    });

    if (!upstream.ok || !upstream.body) {
      const errorText = await upstream.text();
      const isHtml404 =
        upstream.status === 404 &&
        upstream.headers.get("content-type")?.includes("text/html");

      return NextResponse.json(
        {
          error: isHtml404
            ? `Cloud Run returned 404 for ${upstreamUrl}. Set API_BASE_URL to the root Cloud Run service URL only, for example https://your-service-xxxxx-uc.a.run.app`
            : errorText || "Unable to reach the API service."
        },
        { status: upstream.status || 502 }
      );
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive"
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid chat payload." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected proxy failure."
      },
      { status: 500 }
    );
  }
}

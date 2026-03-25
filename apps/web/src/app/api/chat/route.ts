import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerEnv } from "@/lib/config";

const requestSchema = z.object({
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
    const serverEnv = getServerEnv();
    const payload = requestSchema.parse(await request.json());
    const upstream = await fetch(`${serverEnv.API_BASE_URL}/v1/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-proxy-secret": serverEnv.API_PROXY_SHARED_SECRET
      },
      body: JSON.stringify(payload)
    });

    if (!upstream.ok || !upstream.body) {
      const errorText = await upstream.text();
      return NextResponse.json(
        { error: errorText || "Unable to reach the API service." },
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

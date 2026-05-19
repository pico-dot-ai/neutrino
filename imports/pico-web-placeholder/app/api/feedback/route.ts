import { NextResponse } from "next/server";

const FEEDBACK_ENDPOINT =
  process.env.FORM_ENDPOINT ?? process.env.FEEDBACK_FORM_ENDPOINT;
const FEEDBACK_SECRET = process.env.FORM_SECRET;

type FeedbackRequestBody = {
  message?: unknown;
  email?: unknown;
  phone?: unknown;
};

export async function POST(req: Request) {
  if (!FEEDBACK_ENDPOINT) {
    return NextResponse.json(
      { ok: false, error: "missing_feedback_endpoint" },
      { status: 500 }
    );
  }

  if (!FEEDBACK_SECRET) {
    return NextResponse.json(
      { ok: false, error: "missing_form_secret" },
      { status: 500 }
    );
  }

  let parsed: FeedbackRequestBody;
  try {
    parsed = (await req.json()) as FeedbackRequestBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 }
    );
  }

  const message = typeof parsed.message === "string" ? parsed.message : "";
  const email = typeof parsed.email === "string" ? parsed.email : "";
  const phone = typeof parsed.phone === "string" ? parsed.phone : "";

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(FEEDBACK_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: message,
        email,
        phone,
        source: "Website Feedback",
        secret: FEEDBACK_SECRET
      })
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "upstream_fetch_failed",
        detail: error instanceof Error ? error.message : String(error)
      },
      { status: 502 }
    );
  }

  let upstreamPayload: unknown;
  const isJson =
    upstreamResponse.headers
      .get("content-type")
      ?.toLowerCase()
      .includes("json") ?? false;

  if (isJson) {
    try {
      upstreamPayload = await upstreamResponse.json();
    } catch {
      upstreamPayload = null;
    }
  } else {
    upstreamPayload = await upstreamResponse.text();
  }

  if (!upstreamResponse.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "upstream_error",
        status: upstreamResponse.status,
        detail: upstreamPayload
      },
      { status: 502 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      upstream: upstreamPayload ?? null
    },
    { status: 200 }
  );
}

import type { ApiEnv } from "./env";

function json(status: number, payload: unknown) {
  return Response.json(payload, { status });
}

export async function handleRequest(request: Request, env: ApiEnv) {
  const { pathname } = new URL(request.url);

  if (request.method === "GET" && pathname === "/healthz") {
    return json(200, { status: "ok" });
  }

  if (request.method === "GET" && pathname === "/readyz") {
    return json(200, { status: "ready", pico_app_id: env.PICO_APP_ID });
  }

  if (request.method === "GET" && pathname === "/v1/platform-context") {
    return json(200, {
      pico_app_id: env.PICO_APP_ID,
      token_url: env.NEUTRINO_TOKEN_URL,
      grpc_endpoint: env.NEUTRINO_GRPC_ENDPOINT
    });
  }

  return json(404, { error: "Not found." });
}

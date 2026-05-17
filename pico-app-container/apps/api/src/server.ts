import { createServer } from "node:http";
import { Readable } from "node:stream";
import { loadEnv } from "./env";
import { handleRequest } from "./http";

const env = loadEnv();

createServer(async (request, response) => {
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item);
      }
    } else if (value !== undefined) {
      headers.set(key, value);
    }
  }

  const origin = `http://${request.headers.host ?? "127.0.0.1"}`;
  const url = new URL(request.url ?? "/", origin);
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : (Readable.toWeb(request) as ReadableStream);

  const webResponse = await handleRequest(
    new Request(url, {
      method: request.method,
      headers,
      ...(body ? { body, duplex: "half" as const } : {})
    }),
    env
  );

  response.writeHead(webResponse.status, Object.fromEntries(webResponse.headers.entries()));

  if (!webResponse.body) {
    response.end();
    return;
  }

  const reader = webResponse.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    response.write(Buffer.from(value));
  }

  response.end();
}).listen(env.PORT, () => {
  console.log(`Starter API listening on http://127.0.0.1:${env.PORT}`);
});

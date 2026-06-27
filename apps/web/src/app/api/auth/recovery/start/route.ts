import { startBrowserFlow } from "@/lib/auth/browser-flow-start";

export async function GET(request: Request) {
  return startBrowserFlow(request, "recovery");
}

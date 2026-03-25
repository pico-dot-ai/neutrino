import { describe, expect, it, vi } from "vitest";
import { consumeChatStream } from "./chat-stream";

function createResponseFromText(text: string) {
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(text));
        controller.close();
      }
    })
  );
}

describe("consumeChatStream", () => {
  it("parses delta and done events from sse payloads", async () => {
    const onDelta = vi.fn();
    const onDone = vi.fn();
    const onError = vi.fn();

    await consumeChatStream(
      createResponseFromText(
        'data: {"type":"delta","text":"Hello"}\n\n' +
          'data: {"type":"done","text":"Hello world"}\n\n'
      ),
      { onDelta, onDone, onError }
    );

    expect(onDelta).toHaveBeenCalledWith("Hello");
    expect(onDone).toHaveBeenCalledWith("Hello world");
    expect(onError).not.toHaveBeenCalled();
  });
});

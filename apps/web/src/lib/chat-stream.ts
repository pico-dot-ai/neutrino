export type ChatStreamEvent =
  | {
      type: "delta";
      text: string;
    }
  | {
      type: "done";
      text: string;
    }
  | {
      type: "error";
      message: string;
    };

export async function consumeChatStream(
  response: Response,
  handlers: {
    onDelta: (text: string) => void;
    onDone: (text: string) => void;
    onError: (message: string) => void;
  }
) {
  if (!response.body) {
    throw new Error("Missing response body.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    while (buffer.includes("\n\n")) {
      const boundary = buffer.indexOf("\n\n");
      const rawEvent = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);

      const dataLine = rawEvent
        .split("\n")
        .find((line) => line.startsWith("data:"));

      if (!dataLine) {
        continue;
      }

      const payload = JSON.parse(dataLine.slice("data:".length).trim()) as ChatStreamEvent;

      if (payload.type === "delta") {
        handlers.onDelta(payload.text);
      } else if (payload.type === "done") {
        handlers.onDone(payload.text);
      } else {
        handlers.onError(payload.message);
      }
    }
  }
}

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ChatShell } from "./chat-shell";

function createStreamResponse(chunks: string[]) {
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      start(controller) {
        chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
        controller.close();
      }
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream"
      }
    }
  );
}

describe("ChatShell", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockResolvedValue(
      createStreamResponse([
        'data: {"type":"delta","text":"Working"}\n\n',
        'data: {"type":"done","text":"Working"}\n\n'
      ])
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("renders the shell rail, header, and composer", () => {
    render(<ChatShell />);

    expect(screen.getByText("Contract-first workspace")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New chat" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Message Neutrino")).toBeInTheDocument();
    expect(screen.getByText("Chat with the existing API proxy and streaming renderer.")).toBeInTheDocument();
  });

  it("resets the local thread when starting a new chat", async () => {
    render(<ChatShell />);

    fireEvent.change(screen.getByPlaceholderText("Message Neutrino"), {
      target: { value: "Reset me after send" }
    });
    fireEvent.submit(screen.getByPlaceholderText("Message Neutrino").closest("form")!);

    await waitFor(() => {
      expect(screen.getAllByText("Reset me after send").length).toBeGreaterThan(0);
    });
    await screen.findByText("Working");

    fireEvent.click(screen.getByRole("button", { name: "New chat" }));

    await waitFor(() => {
      expect(screen.queryByText("Reset me after send")).not.toBeInTheDocument();
    });
    expect(
      screen.getByText(
        "Neutrino is ready. Ask the Cloud Run API something to verify the full web-to-backend path."
      )
    ).toBeInTheDocument();
  });

  it("sends starter prompts through the existing submit path", async () => {
    render(<ChatShell />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Summarize the Neutrino architecture in one paragraph."
      })
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/chat",
      expect.objectContaining({
        body: expect.stringContaining(
          "Summarize the Neutrino architecture in one paragraph."
        ),
        method: "POST"
      })
    );
  });

  it("opens mobile navigation in a sheet", async () => {
    render(<ChatShell />);

    expect(
      screen.queryByRole("dialog", { name: "Mobile navigation" })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));

    expect(
      await screen.findByRole("dialog", { name: "Mobile navigation" })
    ).toBeInTheDocument();
  });
});

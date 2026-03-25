"use client";

import React, { useState } from "react";
import type { ChatMessage } from "@neutrino/contracts";
import { Button, ScrollArea, Textarea, cn, proseClassName } from "@neutrino/ui";
import { ArrowUp, Sparkles } from "lucide-react";
import { consumeChatStream } from "@/lib/chat-stream";

type LocalMessage = ChatMessage & {
  id: string;
  state?: "streaming" | "complete";
};

const starterPrompts = [
  "Summarize the Neutrino architecture in one paragraph.",
  "Write a brief product positioning statement for Neutrino.",
  "Explain how the web and API apps are separated in this repo."
];

export function ChatShell() {
  const [messages, setMessages] = useState<LocalMessage[]>([
    {
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        "Neutrino is ready. Ask the Cloud Run API something to verify the full web-to-backend path.",
      state: "complete"
    }
  ]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  async function submit(prompt: string) {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || isSending) {
      return;
    }

    setError(null);

    const userMessage: LocalMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmedPrompt
    };
    const assistantMessageId = crypto.randomUUID();

    setMessages((current) => [
      ...current,
      userMessage,
      {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        state: "streaming"
      }
    ]);
    setDraft("");
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(({ role, content }) => ({
            role,
            content
          }))
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(payload?.error ?? "The chat request failed.");
      }

      let finalText = "";

      await consumeChatStream(response, {
        onDelta(text) {
          finalText += text;
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantMessageId
                ? {
                    ...message,
                    content: finalText
                  }
                : message
            )
          );
        },
        onDone(text) {
          finalText = text;
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantMessageId
                ? {
                    ...message,
                    content: finalText,
                    state: "complete"
                  }
                : message
            )
          );
        },
        onError(message) {
          throw new Error(message);
        }
      });
    } catch (submissionError) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : "The chat request failed.";

      setError(message);
      setMessages((current) =>
        current.filter((message) => message.id !== assistantMessageId)
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(140,184,255,0.14),_transparent_30%),linear-gradient(180deg,_var(--background),_var(--muted))] text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-6 pt-4 sm:px-6 lg:px-8">
        <header className="border-border/80 flex items-center justify-between border-b pb-4">
          <div>
            <p className="text-muted-foreground text-sm uppercase tracking-[0.24em]">
              Neutrino
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Contract-first AI chat
            </h1>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Frontend on Vercel</p>
            <p className="text-sm text-muted-foreground">Backend on Cloud Run</p>
          </div>
        </header>

        <div className="grid flex-1 gap-6 py-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="hidden rounded-3xl border border-border/60 bg-panel/70 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur lg:block">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-accent/20 p-2 text-accent-foreground">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Shared design system</p>
                <p className="text-sm text-muted-foreground">
                  `shadcn/ui` foundation with repo-owned tokens.
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <p className="text-sm font-medium">Try a prompt</p>
              {starterPrompts.map((prompt) => (
                <button
                  key={prompt}
                  className="bg-background hover:bg-background/70 w-full rounded-2xl border border-border/70 px-4 py-3 text-left text-sm text-muted-foreground transition"
                  onClick={() => submit(prompt)}
                  type="button"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </aside>

          <section className="flex min-h-[70vh] flex-col rounded-[2rem] border border-border/60 bg-panel/75 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
            <ScrollArea className="flex-1 px-4 py-5 sm:px-6">
              <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
                {messages.map((message) => {
                  const isAssistant = message.role === "assistant";

                  return (
                    <article
                      className={cn(
                        "max-w-[85%] rounded-3xl px-5 py-4 shadow-[0_10px_25px_rgba(15,23,42,0.05)]",
                        isAssistant
                          ? "self-start bg-background border border-border/70"
                          : "self-end bg-accent text-accent-foreground"
                      )}
                      key={message.id}
                    >
                      <p className="mb-2 text-xs font-medium uppercase tracking-[0.24em] opacity-70">
                        {message.role}
                      </p>
                      <div className={proseClassName}>{message.content || "Thinking…"}
                      </div>
                    </article>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="border-border/70 border-t px-4 py-4 sm:px-6">
              <form
                className="mx-auto flex w-full max-w-3xl flex-col gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submit(draft);
                }}
              >
                <div className="bg-background relative rounded-[1.75rem] border border-border/70 p-3 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
                  <Textarea
                    className="min-h-28 resize-none border-0 bg-transparent px-2 py-2 text-base shadow-none focus-visible:ring-0"
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void submit(draft);
                      }
                    }}
                    placeholder="Message Neutrino"
                    value={draft}
                  />
                  <div className="flex items-center justify-between px-2 pt-3">
                    <p className="text-sm text-muted-foreground">
                      Enter to send. Shift+Enter for a new line.
                    </p>
                    <Button disabled={isSending || !draft.trim()} size="icon" type="submit">
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {error ? <p className="text-sm text-destructive">{error}</p> : null}
              </form>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

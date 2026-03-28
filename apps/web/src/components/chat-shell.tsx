"use client";

import React from "react";
import { Sheet, SheetContent, SheetOverlay } from "@neutrino/ui";
import { consumeChatStream } from "@/lib/chat-stream";
import { ChatSidebar } from "./chat-sidebar";
import { ComposerDock } from "./composer-dock";
import { ConversationHeader } from "./conversation-header";
import {
  createInitialMessages,
  starterPrompts,
  type LocalMessage
} from "./chat-shell.types";
import { MessageThread } from "./message-thread";

function deriveTitle(messages: LocalMessage[]) {
  const firstUserMessage = messages.find((message) => message.role === "user");

  if (!firstUserMessage) {
    return "New chat";
  }

  return firstUserMessage.content.slice(0, 48) || "New chat";
}

export function ChatShell() {
  const [messages, setMessages] = React.useState<LocalMessage[]>(() => createInitialMessages());
  const [draft, setDraft] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);
  const messagesRef = React.useRef(messages);

  React.useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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
    const requestMessages = [
      ...messagesRef.current.map(({ role, content }) => ({ role, content })),
      { role: userMessage.role, content: userMessage.content }
    ];

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
    setIsMobileNavOpen(false);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: requestMessages
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

  function handleNewChat() {
    setMessages(createInitialMessages());
    setDraft("");
    setError(null);
    setIsMobileNavOpen(false);
  }

  const title = deriveTitle(messages);

  return (
    <main className="flex h-screen overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(244,246,248,0.96))] text-foreground">
      <div className="hidden h-screen w-[17.5rem] shrink-0 border-r border-border/80 md:block">
        <ChatSidebar
          className="sticky top-0 h-screen"
          isSending={isSending}
          onNewChat={handleNewChat}
          onPromptSelect={(prompt) => void submit(prompt)}
          starterPrompts={starterPrompts}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <ConversationHeader
          isSending={isSending}
          onOpenSidebar={() => setIsMobileNavOpen(true)}
          title={title}
        />
        <MessageThread messages={messages} />
        <ComposerDock
          draft={draft}
          error={error}
          isSending={isSending}
          onChange={setDraft}
          onSubmit={() => void submit(draft)}
        />
      </div>

      <Sheet onOpenChange={setIsMobileNavOpen} open={isMobileNavOpen}>
        <SheetOverlay className="md:hidden" />
        <SheetContent
          aria-label="Mobile navigation"
          className="md:hidden"
          side="left"
        >
          <ChatSidebar
            isSending={isSending}
            onNewChat={handleNewChat}
            onPromptSelect={(prompt) => void submit(prompt)}
            starterPrompts={starterPrompts}
          />
        </SheetContent>
      </Sheet>
    </main>
  );
}

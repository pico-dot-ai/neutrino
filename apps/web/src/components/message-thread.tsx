"use client";

import React from "react";
import type { LocalMessage } from "./chat-shell.types";
import { ScrollArea, cn, proseClassName } from "@neutrino/ui";

type MessageThreadProps = {
  messages: LocalMessage[];
};

export function MessageThread({ messages }: MessageThreadProps) {
  const endRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (typeof endRef.current?.scrollIntoView === "function") {
      endRef.current.scrollIntoView({ block: "end" });
    }
  }, [messages]);

  return (
    <ScrollArea className="flex-1">
      <div className="mx-auto flex w-full max-w-5xl flex-col px-4 py-8 sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
          {messages.map((message) => {
            const isAssistant = message.role === "assistant";

            return (
              <article
                className={cn(
                  "group flex w-full gap-4",
                  isAssistant ? "items-start" : "justify-end"
                )}
                key={message.id}
              >
                {isAssistant ? (
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-panel text-sm font-semibold text-foreground">
                    N
                  </div>
                ) : null}

                <div
                  className={cn(
                    "min-w-0",
                    isAssistant
                      ? "max-w-none flex-1"
                      : "max-w-[min(85%,36rem)] rounded-[1.75rem] bg-secondary px-4 py-3 text-sm shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
                  )}
                >
                  <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    {message.role}
                  </p>
                  <div
                    className={cn(
                      proseClassName,
                      isAssistant ? "text-[15px] leading-7 text-foreground" : "leading-7"
                    )}
                  >
                    {message.content || "Thinking…"}
                  </div>
                </div>
              </article>
            );
          })}
          <div aria-hidden="true" ref={endRef} />
        </div>
      </div>
    </ScrollArea>
  );
}

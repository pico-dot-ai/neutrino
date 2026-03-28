"use client";

import React from "react";
import { Badge, Button, Separator, cn } from "@neutrino/ui";
import { MessageSquarePlus, Sparkles } from "lucide-react";

type ChatSidebarProps = {
  className?: string;
  isSending: boolean;
  onNewChat: () => void;
  onPromptSelect: (prompt: string) => void;
  starterPrompts: string[];
};

export function ChatSidebar({
  className,
  isSending,
  onNewChat,
  onPromptSelect,
  starterPrompts
}: ChatSidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden bg-sidebar text-sidebar-foreground",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.26em] text-muted-foreground">
            Neutrino
          </p>
          <h1 className="mt-1 text-base font-semibold tracking-tight">
            Contract-first workspace
          </h1>
        </div>
        <Badge variant="muted">Web</Badge>
      </div>

      <div className="px-4 pb-4 sm:px-5">
        <Button
          className="w-full justify-start"
          onClick={onNewChat}
          type="button"
          variant="secondary"
        >
          <MessageSquarePlus className="h-4 w-4" />
          New chat
        </Button>
      </div>

      <Separator />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Quick prompts</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Reuse the existing starter prompts from the current shell.
            </p>
          </div>
          <Sparkles className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="mt-4 space-y-2 pb-1">
          {starterPrompts.map((prompt) => (
            <button
              className="w-full rounded-2xl border border-transparent px-3 py-3 text-left text-sm leading-6 text-foreground transition hover:border-border hover:bg-background/70 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSending}
              key={prompt}
              onClick={() => onPromptSelect(prompt)}
              type="button"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      <div className="px-4 py-4 sm:px-5">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
          Session
        </p>
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-background/80 px-3 py-3">
          <div>
            <p className="text-sm font-medium">Cloud Run stream</p>
            <p className="text-sm text-muted-foreground">Single thread, live tokens</p>
          </div>
          <Badge variant="outline">{isSending ? "Live" : "Ready"}</Badge>
        </div>
      </div>
    </aside>
  );
}

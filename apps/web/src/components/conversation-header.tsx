"use client";

import React from "react";
import { Badge, Button } from "@neutrino/ui";
import { Menu } from "lucide-react";

type ConversationHeaderProps = {
  isSending: boolean;
  onOpenSidebar: () => void;
  title: string;
};

export function ConversationHeader({
  isSending,
  onOpenSidebar,
  title
}: ConversationHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            aria-label="Open navigation"
            className="md:hidden"
            onClick={onOpenSidebar}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{title}</p>
            <p className="text-sm text-muted-foreground">
              Chat with the existing API proxy and streaming renderer.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline">gpt-5-mini</Badge>
          <Badge variant="muted">{isSending ? "Responding" : "Ready"}</Badge>
        </div>
      </div>
    </header>
  );
}

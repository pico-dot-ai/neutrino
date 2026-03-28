"use client";

import React from "react";
import { Button, Textarea } from "@neutrino/ui";
import { ArrowUp } from "lucide-react";

type ComposerDockProps = {
  draft: string;
  error: string | null;
  isSending: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

const MAX_TEXTAREA_HEIGHT = 220;

export function ComposerDock({
  draft,
  error,
  isSending,
  onChange,
  onSubmit
}: ComposerDockProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  React.useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [draft]);

  return (
    <div className="sticky bottom-0 border-t border-border/80 bg-background/88 pb-4 backdrop-blur-xl">
      <div className="mx-auto w-full max-w-5xl px-4 pt-4 sm:px-6">
        <form
          className="mx-auto flex max-w-3xl flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="overflow-hidden rounded-[1.75rem] border border-border-strong/70 bg-composer shadow-[0_22px_60px_rgba(15,23,42,0.08)]">
            <div className="px-4 pt-2">
              <Textarea
                className="max-h-56 min-h-24 resize-none border-0 bg-transparent px-0 py-2 text-[15px] leading-7 shadow-none focus-visible:ring-0"
                onChange={(event) => onChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    onSubmit();
                  }
                }}
                placeholder="Message Neutrino"
                ref={textareaRef}
                value={draft}
              />
            </div>

            <div className="flex items-center justify-between gap-4 px-4 py-3">
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
    </div>
  );
}

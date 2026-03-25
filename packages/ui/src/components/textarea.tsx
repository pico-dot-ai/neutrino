import * as React from "react";
import { cn } from "../lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "border-input placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-24 w-full rounded-[1.5rem] border bg-transparent px-4 py-3 text-sm outline-none transition focus-visible:ring-2",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };

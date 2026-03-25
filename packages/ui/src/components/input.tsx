import * as React from "react";
import { cn } from "../lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => {
    return (
      <input
        className={cn(
          "border-input placeholder:text-muted-foreground focus-visible:ring-ring flex h-11 w-full rounded-full border bg-background px-4 text-sm outline-none transition focus-visible:ring-2",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };

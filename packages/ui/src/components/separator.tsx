import * as React from "react";
import { cn } from "../lib/utils";

function Separator({
  className,
  decorative = true,
  orientation = "horizontal",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  decorative?: boolean;
  orientation?: "horizontal" | "vertical";
}) {
  return (
    <div
      aria-hidden={decorative}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className
      )}
      role={decorative ? "presentation" : "separator"}
      {...props}
    />
  );
}

export { Separator };

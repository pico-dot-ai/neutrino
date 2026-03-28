"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

type SheetContextValue = {
  open: boolean;
  setOpen: (value: boolean) => void;
};

const SheetContext = React.createContext<SheetContextValue | null>(null);

function useSheetContext(componentName: string) {
  const context = React.useContext(SheetContext);

  if (!context) {
    throw new Error(`${componentName} must be used within <Sheet>.`);
  }

  return context;
}

function Sheet({
  children,
  open,
  onOpenChange,
  defaultOpen = false
}: React.PropsWithChildren<{
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
}>) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isControlled = open !== undefined;
  const currentOpen = isControlled ? open : uncontrolledOpen;

  const setOpen = React.useCallback(
    (value: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(value);
      }

      onOpenChange?.(value);
    },
    [isControlled, onOpenChange]
  );

  return (
    <SheetContext.Provider value={{ open: currentOpen, setOpen }}>
      {children}
    </SheetContext.Provider>
  );
}

function SheetTrigger({
  children,
  asChild = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
}) {
  const { setOpen } = useSheetContext("SheetTrigger");
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      {...props}
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        props.onClick?.(event);
        if (!event.defaultPrevented) {
          setOpen(true);
        }
      }}
    >
      {children}
    </Comp>
  );
}

function SheetClose({
  children,
  asChild = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
}) {
  const { setOpen } = useSheetContext("SheetClose");
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      {...props}
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        props.onClick?.(event);
        if (!event.defaultPrevented) {
          setOpen(false);
        }
      }}
    >
      {children}
    </Comp>
  );
}

function SheetPortal({ children }: React.PropsWithChildren) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(children, document.body);
}

function SheetOverlay({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { open, setOpen } = useSheetContext("SheetOverlay");

  if (!open) {
    return null;
  }

  return (
    <SheetPortal>
      <div
        {...props}
        className={cn("fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]", className)}
        onClick={(event) => {
          props.onClick?.(event);
          if (!event.defaultPrevented) {
            setOpen(false);
          }
        }}
      />
    </SheetPortal>
  );
}

const sheetContentVariants = cva(
  "fixed z-50 flex h-full max-w-[20rem] flex-col border bg-panel shadow-[0_24px_80px_rgba(15,23,42,0.12)] outline-none",
  {
    variants: {
      side: {
        left: "inset-y-0 left-0 w-[calc(100vw-2rem)] border-r",
        right: "inset-y-0 right-0 w-[calc(100vw-2rem)] border-l"
      }
    },
    defaultVariants: {
      side: "left"
    }
  }
);

function SheetContent({
  className,
  children,
  side,
  ...props
}: React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof sheetContentVariants>) {
  const { open, setOpen } = useSheetContext("SheetContent");

  React.useEffect(() => {
    if (!open) {
      return undefined;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);

  if (!open) {
    return null;
  }

  return (
    <SheetPortal>
      <div
        {...props}
        aria-modal="true"
        className={cn(sheetContentVariants({ side, className }))}
        role="dialog"
      >
        {children}
      </div>
    </SheetPortal>
  );
}

export { Sheet, SheetClose, SheetContent, SheetOverlay, SheetTrigger };

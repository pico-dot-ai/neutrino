import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { DotField } from "@/components/landing/dot-field";
import "./globals.css";

export const metadata: Metadata = {
  title: "pico.ai",
  description: "There's an AI for everyone.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="relative min-h-screen bg-[#f7f8fa]"
        style={{
          background:
            "radial-gradient(circle at 50% 30%, rgba(255, 255, 255, 0.85), transparent 60%), #f7f8fa"
        }}
      >
        <DotField className="fixed inset-0 z-0 pointer-events-none [&_canvas]:absolute [&_canvas]:inset-0 [&_canvas]:h-full [&_canvas]:w-full" />
        <div className="relative z-10 min-h-screen">{children}</div>
      {/* impeccable-live-start */}
<script src="http://localhost:8400/live.js"></script>
{/* impeccable-live-end */}
</body>
    </html>
  );
}

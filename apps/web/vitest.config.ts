import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  oxc: {
    include: /\.[jt]sx?$/,
    jsx: {
      runtime: "automatic",
      importSource: "react"
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./src")
    }
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"]
  }
});

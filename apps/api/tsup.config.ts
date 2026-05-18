import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  target: "node24",
  outDir: "dist",
  noExternal: ["@neutrino/ai-gateway", "@neutrino/ports", "@neutrino/schema"]
});

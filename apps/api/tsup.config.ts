import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts", "src/migrate.ts"],
  format: ["esm"],
  target: "node24",
  outDir: "dist",
  noExternal: [/^@neutrino\//],
  external: ["pg", "pg-native"]
});

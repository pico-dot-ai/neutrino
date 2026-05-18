import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, "..", "..", "migrations");

export type CoreMigration = {
  id: string;
  sql: string;
};

export async function readCoreMigrations(): Promise<CoreMigration[]> {
  const entries = await fs.readdir(migrationsDir);
  const files = entries.filter((entry) => entry.endsWith(".sql")).sort();

  return Promise.all(
    files.map(async (file) => ({
      id: file.replace(/\.sql$/, ""),
      sql: await fs.readFile(path.join(migrationsDir, file), "utf8")
    }))
  );
}

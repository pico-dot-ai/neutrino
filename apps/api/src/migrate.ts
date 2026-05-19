import { runCoreMigrations } from "@neutrino/core";

const connectionString = process.env.CORE_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Missing CORE_DATABASE_URL (or DATABASE_URL) for core migrations.");
  process.exit(1);
}

try {
  const result = await runCoreMigrations({ connectionString });
  console.log(
    JSON.stringify(
      {
        applied: result.applied,
        skipped: result.skipped
      },
      null,
      2
    )
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : "Unknown migration failure.");
  process.exit(1);
}

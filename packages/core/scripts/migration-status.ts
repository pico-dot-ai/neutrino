import { getCoreMigrationStatus } from "../src/persistence/migrator";

const connectionString = process.env.CORE_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Missing CORE_DATABASE_URL (or DATABASE_URL) for migration status.");
  process.exit(1);
}

try {
  const status = await getCoreMigrationStatus({ connectionString });
  console.log(JSON.stringify(status, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : "Unknown migration status failure.");
  process.exit(1);
}

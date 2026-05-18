import { Pool } from "pg";
import { readCoreMigrations, type CoreMigration } from "./migrations";

const MIGRATIONS_TABLE = "core_schema_migrations";

export type CoreMigratorOptions = {
  connectionString: string;
};

export type CoreMigrationStatus = {
  allMigrations: string[];
  appliedMigrations: string[];
  pendingMigrations: string[];
};

async function withPool<T>(
  connectionString: string,
  work: (pool: Pool) => Promise<T>
): Promise<T> {
  const pool = new Pool({ connectionString });
  try {
    return await work(pool);
  } finally {
    await pool.end();
  }
}

async function ensureMigrationsTable(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      migration_id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function getAppliedMigrationIds(pool: Pool): Promise<Set<string>> {
  const result = await pool.query<{ migration_id: string }>(
    `SELECT migration_id FROM ${MIGRATIONS_TABLE};`
  );

  return new Set(result.rows.map((row) => row.migration_id));
}

async function applySingleMigration(pool: Pool, migration: CoreMigration) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(migration.sql);
    await client.query(
      `INSERT INTO ${MIGRATIONS_TABLE} (migration_id) VALUES ($1) ON CONFLICT (migration_id) DO NOTHING;`,
      [migration.id]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function runCoreMigrations(
  options: CoreMigratorOptions
): Promise<{ applied: string[]; skipped: string[] }> {
  return withPool(options.connectionString, async (pool) => {
    await ensureMigrationsTable(pool);
    const migrations = await readCoreMigrations();
    const appliedIds = await getAppliedMigrationIds(pool);
    const applied: string[] = [];
    const skipped: string[] = [];

    for (const migration of migrations) {
      if (appliedIds.has(migration.id)) {
        skipped.push(migration.id);
        continue;
      }

      await applySingleMigration(pool, migration);
      applied.push(migration.id);
    }

    return { applied, skipped };
  });
}

export async function getCoreMigrationStatus(
  options: CoreMigratorOptions
): Promise<CoreMigrationStatus> {
  return withPool(options.connectionString, async (pool) => {
    await ensureMigrationsTable(pool);
    const migrations = await readCoreMigrations();
    const appliedIds = await getAppliedMigrationIds(pool);

    const allMigrations = migrations.map((migration) => migration.id);
    const appliedMigrations = allMigrations.filter((id) => appliedIds.has(id));
    const pendingMigrations = allMigrations.filter((id) => !appliedIds.has(id));

    return {
      allMigrations,
      appliedMigrations,
      pendingMigrations
    };
  });
}

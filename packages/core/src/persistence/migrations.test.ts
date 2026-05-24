import { describe, expect, it } from "vitest";
import { readCoreMigrations } from "./migrations";

describe("readCoreMigrations", () => {
  it("loads and sorts sql migrations", async () => {
    const migrations = await readCoreMigrations();

    expect(migrations.length).toBeGreaterThan(0);
    expect(migrations[0]?.id).toBe("0001_core_foundation");
    expect(migrations[0]?.sql).toContain("CREATE TABLE IF NOT EXISTS workspaces");
    expect(migrations[0]?.sql).toContain("CREATE TABLE IF NOT EXISTS manifest_records");
    expect(migrations[0]?.sql).toContain("CREATE TABLE IF NOT EXISTS actors");
    expect(migrations[0]?.sql).toContain("CREATE TABLE IF NOT EXISTS grants");
    expect(migrations[0]?.sql).toContain("CREATE TABLE IF NOT EXISTS executions");
  });
});

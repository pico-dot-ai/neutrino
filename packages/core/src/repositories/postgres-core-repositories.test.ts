import { describe, expect, it } from "vitest";
import {
  devAgentAppManifest,
  devAgentHarnessManifest,
  devAgentLocalBindingManifest,
  devAgentManifest,
  devAgentServiceManifest
} from "../dev-agent/manifests";
import { runCoreMigrations } from "../persistence/migrator";
import { createPostgresCoreRepositories } from "./postgres-core-repositories";

const connectionString = process.env.CORE_TEST_DATABASE_URL;
const describePostgres = connectionString ? describe : describe.skip;

function uniqueScope() {
  const id = crypto.randomUUID().replace(/-/g, "");
  return {
    workspaceId: `workspace_${id}`,
    projectId: `project_${id}`
  };
}

describePostgres("Postgres core repositories", () => {
  it("persists manifests, access graph, bindings, runs, traces, usage, memory, and artifacts", async () => {
    await runCoreMigrations({ connectionString: connectionString as string });
    const core = createPostgresCoreRepositories({
      connectionString: connectionString as string
    });
    const scope = uniqueScope();
    const timestamp = "2026-05-24T00:00:00.000Z";

    try {
      await core.manifestRegistry.registerManifest({
        scope,
        manifest: devAgentAppManifest
      });
      await core.manifestRegistry.registerManifest({
        scope,
        manifest: devAgentServiceManifest
      });
      await core.manifestRegistry.registerManifest({
        scope,
        manifest: devAgentHarnessManifest
      });
      await core.manifestRegistry.registerManifest({
        scope,
        manifest: devAgentManifest
      });
      await core.manifestRegistry.registerManifest({
        scope,
        manifest: devAgentLocalBindingManifest
      });

      await expect(
        core.manifestRegistry.resolveManifest({
          scope,
          kind: "pico.agent",
          resourceId: devAgentManifest.id
        })
      ).resolves.toMatchObject({
        kind: "pico.agent",
        scope
      });

      await core.accessGraphRepository.upsertActor({
        actorId: "actor_alice",
        workspaceId: scope.workspaceId,
        kind: "user",
        handle: "alice",
        displayName: "Alice",
        email: "alice@example.com",
        createdAt: timestamp,
        updatedAt: timestamp
      });
      await core.accessGraphRepository.upsertGroup({
        groupId: "group_support",
        workspaceId: scope.workspaceId,
        slug: "support",
        displayName: "Support",
        createdAt: timestamp,
        updatedAt: timestamp
      });
      await core.accessGraphRepository.upsertIdentity({
        identityId: "identity_okta_alice",
        workspaceId: scope.workspaceId,
        provider: "okta",
        externalId: "00u123",
        kind: "user",
        mapsToType: "actor",
        mapsToId: "actor_alice",
        createdAt: timestamp,
        updatedAt: timestamp
      });
      await core.accessGraphRepository.addGrant({
        grantId: "grant_support_app",
        workspaceId: scope.workspaceId,
        granteeType: "group",
        granteeId: "group_support",
        relation: "can_use",
        resourceType: "app",
        resourceId: "@acme/support-desk",
        createdAt: timestamp
      });
      await expect(
        core.accessGraphRepository.listGrants({
          workspaceId: scope.workspaceId,
          granteeType: "group",
          granteeId: "group_support"
        })
      ).resolves.toMatchObject([
        {
          relation: "can_use",
          resourceType: "app",
          resourceId: "@acme/support-desk"
        }
      ]);

      await core.bindingResolver.registerBinding(scope, devAgentLocalBindingManifest);
      await expect(
        core.bindingResolver.resolveBinding({
          scope,
          environment: "local",
          requirement: "languageModel"
        })
      ).resolves.toMatchObject({
        provider: "openai",
        model: "gpt-5.2"
      });

      await core.runRepository.createRun({
        runId: "run_postgres",
        scope,
        appId: devAgentAppManifest.id,
        actionId: "generate_reply",
        actorId: "actor_alice",
        servicePackageName: devAgentServiceManifest.packageName,
        serviceVersion: devAgentServiceManifest.version,
        schemaVersions: {},
        agentId: devAgentManifest.id,
        harnessId: devAgentHarnessManifest.id,
        conversationId: "conversation_1",
        status: "running",
        startedAt: timestamp
      });
      await core.traceRepository.appendTrace({
        traceId: "trace_postgres",
        runId: "run_postgres",
        eventType: "runtime.started",
        message: "Started.",
        createdAt: timestamp
      });
      await core.runRepository.updateRun({
        runId: "run_postgres",
        scope,
        appId: devAgentAppManifest.id,
        actionId: "generate_reply",
        actorId: "actor_alice",
        servicePackageName: devAgentServiceManifest.packageName,
        serviceVersion: devAgentServiceManifest.version,
        schemaVersions: {},
        agentId: devAgentManifest.id,
        harnessId: devAgentHarnessManifest.id,
        conversationId: "conversation_1",
        status: "succeeded",
        output: "ok",
        startedAt: timestamp,
        completedAt: "2026-05-24T00:00:01.000Z"
      });
      await core.usageLedger.recordUsage({
        usageId: "usage_postgres",
        scope,
        runId: "run_postgres",
        provider: "language-model",
        model: "gpt-test",
        createdAt: timestamp
      });
      await core.memoryRepository.writeMemory({
        memoryId: "memory_postgres",
        scope,
        kind: "summary",
        content: "Remember this.",
        sourceRunId: "run_postgres",
        createdAt: timestamp
      });
      await core.artifactRepository.createArtifact({
        artifactId: "artifact_postgres",
        scope,
        objectUri: "object://artifact",
        contentType: "text/plain",
        sizeBytes: 12,
        checksum: "checksum",
        createdAt: timestamp
      });

      await expect(core.runRepository.listRuns(scope)).resolves.toMatchObject([
        {
          runId: "run_postgres",
          status: "succeeded",
          actorId: "actor_alice",
          actionId: "generate_reply"
        }
      ]);
      await expect(core.traceRepository.listTraces("run_postgres")).resolves.toHaveLength(1);
      await expect(core.usageLedger.listUsage(scope)).resolves.toMatchObject([
        {
          usageId: "usage_postgres",
          model: "gpt-test"
        }
      ]);
      await expect(core.memoryRepository.listMemory(scope)).resolves.toMatchObject([
        {
          memoryId: "memory_postgres",
          content: "Remember this."
        }
      ]);
      await expect(core.artifactRepository.getArtifact("artifact_postgres")).resolves.toMatchObject({
        artifactId: "artifact_postgres",
        objectUri: "object://artifact"
      });
    } finally {
      await core.close();
    }
  });
});

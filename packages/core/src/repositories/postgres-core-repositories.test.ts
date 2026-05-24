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
    const suffix = scope.workspaceId.replace("workspace_", "");
    const actorId = `actor_alice_${suffix}`;
    const groupId = `group_support_${suffix}`;
    const identityId = `identity_okta_alice_${suffix}`;
    const grantId = `grant_support_app_${suffix}`;
    const runId = `run_postgres_${suffix}`;
    const conversationId = `conversation_${suffix}`;
    const traceId = `trace_postgres_${suffix}`;
    const usageId = `usage_postgres_${suffix}`;
    const memoryId = `memory_postgres_${suffix}`;
    const artifactId = `artifact_postgres_${suffix}`;
    const failedRunId = `run_postgres_failed_${suffix}`;
    const failedTraceId = `trace_postgres_failed_${suffix}`;
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
        actorId,
        workspaceId: scope.workspaceId,
        kind: "user",
        handle: "alice",
        displayName: "Alice",
        email: "alice@example.com",
        createdAt: timestamp,
        updatedAt: timestamp
      });
      await core.accessGraphRepository.upsertGroup({
        groupId,
        workspaceId: scope.workspaceId,
        slug: "support",
        displayName: "Support",
        createdAt: timestamp,
        updatedAt: timestamp
      });
      await core.accessGraphRepository.upsertIdentity({
        identityId,
        workspaceId: scope.workspaceId,
        provider: "okta",
        externalId: "00u123",
        kind: "user",
        mapsToType: "actor",
        mapsToId: actorId,
        createdAt: timestamp,
        updatedAt: timestamp
      });
      await core.accessGraphRepository.addGrant({
        grantId,
        workspaceId: scope.workspaceId,
        granteeType: "group",
        granteeId: groupId,
        relation: "can_use",
        resourceType: "app",
        resourceId: "@acme/support-desk",
        createdAt: timestamp
      });
      await expect(
        core.accessGraphRepository.listGrants({
          workspaceId: scope.workspaceId,
          granteeType: "group",
          granteeId: groupId
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
        runId,
        scope,
        appId: devAgentAppManifest.id,
        actionId: "generate_reply",
        actorId,
        servicePackageName: devAgentServiceManifest.packageName,
        serviceVersion: devAgentServiceManifest.version,
        schemaVersions: {},
        agentId: devAgentManifest.id,
        harnessId: devAgentHarnessManifest.id,
        conversationId,
        status: "running",
        startedAt: timestamp
      });
      await core.traceRepository.appendTrace({
        traceId,
        runId,
        eventType: "runtime.started",
        message: "Started.",
        createdAt: timestamp
      });
      await core.runRepository.updateRun({
        runId,
        scope,
        appId: devAgentAppManifest.id,
        actionId: "generate_reply",
        actorId,
        servicePackageName: devAgentServiceManifest.packageName,
        serviceVersion: devAgentServiceManifest.version,
        schemaVersions: {},
        agentId: devAgentManifest.id,
        harnessId: devAgentHarnessManifest.id,
        conversationId,
        status: "succeeded",
        output: "ok",
        startedAt: timestamp,
        completedAt: "2026-05-24T00:00:01.000Z"
      });
      await core.usageLedger.recordUsage({
        usageId,
        scope,
        runId,
        provider: "language-model",
        model: "gpt-test",
        createdAt: timestamp
      });
      await core.memoryRepository.writeMemory({
        memoryId,
        scope,
        kind: "summary",
        content: "Remember this.",
        sourceRunId: runId,
        createdAt: timestamp
      });
      await core.artifactRepository.createArtifact({
        artifactId,
        scope,
        objectUri: "object://artifact",
        contentType: "text/plain",
        sizeBytes: 12,
        checksum: "checksum",
        createdAt: timestamp
      });
      await core.runRepository.createRun({
        runId: failedRunId,
        scope,
        appId: devAgentAppManifest.id,
        actionId: "generate_reply",
        actorId,
        servicePackageName: devAgentServiceManifest.packageName,
        serviceVersion: devAgentServiceManifest.version,
        schemaVersions: {
          input: "./schemas/generate-reply.input.json",
          output: "./schemas/generate-reply.output.json"
        },
        agentId: devAgentManifest.id,
        harnessId: devAgentHarnessManifest.id,
        conversationId,
        status: "running",
        startedAt: "2026-05-24T00:00:02.000Z"
      });
      await core.runRepository.updateRun({
        runId: failedRunId,
        scope,
        appId: devAgentAppManifest.id,
        actionId: "generate_reply",
        actorId,
        servicePackageName: devAgentServiceManifest.packageName,
        serviceVersion: devAgentServiceManifest.version,
        bindingSnapshotId: devAgentLocalBindingManifest.id,
        schemaVersions: {
          input: "./schemas/generate-reply.input.json",
          output: "./schemas/generate-reply.output.json"
        },
        agentId: devAgentManifest.id,
        harnessId: devAgentHarnessManifest.id,
        conversationId,
        status: "failed",
        error: "Model provider failed.",
        startedAt: "2026-05-24T00:00:02.000Z",
        completedAt: "2026-05-24T00:00:03.000Z"
      });
      await core.traceRepository.appendTrace({
        traceId: failedTraceId,
        runId: failedRunId,
        eventType: "runtime.failed",
        message: "Model provider failed.",
        createdAt: timestamp
      });

      await expect(core.runRepository.listRuns(scope)).resolves.toMatchObject([
        {
          runId: failedRunId,
          status: "failed",
          actorId,
          actionId: "generate_reply",
          servicePackageName: devAgentServiceManifest.packageName,
          serviceVersion: devAgentServiceManifest.version,
          bindingSnapshotId: devAgentLocalBindingManifest.id,
          schemaVersions: {
            input: "./schemas/generate-reply.input.json",
            output: "./schemas/generate-reply.output.json"
          },
          error: "Model provider failed."
        },
        {
          runId,
          status: "succeeded",
          actorId,
          actionId: "generate_reply"
        }
      ]);
      await expect(core.traceRepository.listTraces(runId)).resolves.toHaveLength(1);
      await expect(core.traceRepository.listTraces(failedRunId)).resolves.toMatchObject([
        {
          traceId: failedTraceId,
          eventType: "runtime.failed",
          message: "Model provider failed."
        }
      ]);
      await expect(core.usageLedger.listUsage(scope)).resolves.toMatchObject([
        {
          usageId,
          model: "gpt-test"
        }
      ]);
      await expect(core.memoryRepository.listMemory(scope)).resolves.toMatchObject([
        {
          memoryId,
          content: "Remember this."
        }
      ]);
      await expect(core.artifactRepository.getArtifact(artifactId)).resolves.toMatchObject({
        artifactId,
        objectUri: "object://artifact"
      });
      await expect(core.artifactRepository.listArtifacts(scope)).resolves.toMatchObject([
        {
          artifactId,
          objectUri: "object://artifact"
        }
      ]);
    } finally {
      await core.close();
    }
  }, 30_000);
});

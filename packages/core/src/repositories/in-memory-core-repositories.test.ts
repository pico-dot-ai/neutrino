import { describe, expect, it } from "vitest";
import {
  devAgentAppManifest,
  devAgentHarnessManifest,
  devAgentLocalBindingManifest,
  devAgentManifest,
  devAgentServiceManifest
} from "../dev-agent/manifests";
import { createInMemoryCoreRepositories } from "./in-memory-core-repositories";

const scope = {
  workspaceId: "workspace_1",
  projectId: "project_1"
};

describe("in-memory core repositories", () => {
  it("registers and resolves scoped manifest records", async () => {
    const core = createInMemoryCoreRepositories();

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
  });

  it("resolves newest active manifest version and isolates by scope", async () => {
    const core = createInMemoryCoreRepositories();
    const overlappingManifestV1 = {
      ...devAgentManifest,
      id: "pico.agent.overlap",
      version: 1
    };
    const overlappingManifestV2 = {
      ...devAgentManifest,
      id: "pico.agent.overlap",
      version: 2
    };
    const otherScope = {
      workspaceId: "workspace_2",
      projectId: "project_2"
    };

    await core.manifestRegistry.registerManifest({
      scope,
      manifest: overlappingManifestV1
    });
    await core.manifestRegistry.registerManifest({
      scope,
      manifest: overlappingManifestV2
    });
    await core.manifestRegistry.registerManifest({
      scope: otherScope,
      manifest: {
        ...devAgentManifest,
        id: "pico.agent.overlap",
        version: 3
      }
    });

    await expect(
      core.manifestRegistry.resolveManifest({
        scope,
        kind: "pico.agent",
        resourceId: "pico.agent.overlap"
      })
    ).resolves.toMatchObject({
      version: 2
    });
    await expect(
      core.manifestRegistry.resolveManifest({
        scope: otherScope,
        kind: "pico.agent",
        resourceId: "pico.agent.overlap"
      })
    ).resolves.toMatchObject({
      version: 3
    });

    await expect(
      core.manifestRegistry.listManifests({
        scope,
        kind: "pico.agent",
        resourceId: "pico.agent.overlap"
      })
    ).resolves.toMatchObject([
      { version: 2 },
      { version: 1 }
    ]);
  });

  it("registers services and resolves local bindings", async () => {
    const core = createInMemoryCoreRepositories();

    await core.serviceCatalog.registerService(devAgentServiceManifest);
    await core.bindingResolver.registerBinding(scope, devAgentLocalBindingManifest);

    await expect(core.serviceCatalog.getService(devAgentServiceManifest.id)).resolves.toMatchObject({
      serviceId: devAgentServiceManifest.id
    });
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
    await expect(
      core.bindingResolver.resolveBinding({
        scope,
        environment: "local",
        requirement: "devAgentService"
      })
    ).resolves.toMatchObject({
      provider: "core",
      serviceId: devAgentServiceManifest.id,
      capabilityId: "pico.capability.dev-agent.generate"
    });
  });

  it("lists runs from newest to oldest by scope", async () => {
    const core = createInMemoryCoreRepositories();

    await core.runRepository.createRun({
      runId: "run_old",
      scope,
      appId: "pico.dev-agent",
      agentId: "pico.dev-agent.agent",
      harnessId: "pico.dev-agent.harness",
      conversationId: "conversation_1",
      status: "succeeded",
      startedAt: "2026-05-20T00:00:00.000Z"
    });
    await core.runRepository.createRun({
      runId: "run_other_scope",
      scope: {
        workspaceId: "workspace_2",
        projectId: "project_1"
      },
      appId: "pico.dev-agent",
      agentId: "pico.dev-agent.agent",
      harnessId: "pico.dev-agent.harness",
      conversationId: "conversation_2",
      status: "succeeded",
      startedAt: "2026-05-20T02:00:00.000Z"
    });
    await core.runRepository.createRun({
      runId: "run_new",
      scope,
      appId: "pico.dev-agent",
      agentId: "pico.dev-agent.agent",
      harnessId: "pico.dev-agent.harness",
      conversationId: "conversation_3",
      status: "succeeded",
      startedAt: "2026-05-20T01:00:00.000Z"
    });

    await expect(core.runRepository.listRuns(scope)).resolves.toMatchObject([
      { runId: "run_new" },
      { runId: "run_old" }
    ]);
  });

  it("stores actors, groups, identities, and grants in a simple access graph", async () => {
    const core = createInMemoryCoreRepositories();
    const timestamp = "2026-05-23T00:00:00.000Z";

    await core.accessGraphRepository.upsertActor({
      actorId: "actor_alice",
      workspaceId: "workspace_1",
      kind: "user",
      handle: "alice",
      displayName: "Alice",
      email: "alice@example.com",
      createdAt: timestamp,
      updatedAt: timestamp
    });
    await core.accessGraphRepository.upsertGroup({
      groupId: "group_support",
      workspaceId: "workspace_1",
      slug: "support",
      displayName: "Support",
      createdAt: timestamp,
      updatedAt: timestamp
    });
    await core.accessGraphRepository.upsertIdentity({
      identityId: "identity_okta_alice",
      workspaceId: "workspace_1",
      provider: "okta",
      externalId: "00u123",
      kind: "user",
      mapsToType: "actor",
      mapsToId: "actor_alice",
      createdAt: timestamp,
      updatedAt: timestamp
    });
    await core.accessGraphRepository.addGrant({
      grantId: "grant_alice_support",
      workspaceId: "workspace_1",
      granteeType: "actor",
      granteeId: "actor_alice",
      relation: "member_of",
      resourceType: "group",
      resourceId: "group_support",
      createdAt: timestamp
    });
    await core.accessGraphRepository.addGrant({
      grantId: "grant_support_app",
      workspaceId: "workspace_1",
      granteeType: "group",
      granteeId: "group_support",
      relation: "can_use",
      resourceType: "app",
      resourceId: "@acme/support-desk",
      createdAt: timestamp
    });

    await expect(
      core.accessGraphRepository.listGrants({
        workspaceId: "workspace_1",
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
  });
});

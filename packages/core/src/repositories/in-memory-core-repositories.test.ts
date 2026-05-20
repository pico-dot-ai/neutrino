import { describe, expect, it } from "vitest";
import {
  devAgentLocalBindingManifest,
  devAgentServiceManifest
} from "../dev-agent/manifests";
import { createInMemoryCoreRepositories } from "./in-memory-core-repositories";

const scope = {
  tenantId: "tenant_1",
  projectId: "project_1"
};

describe("in-memory core repositories", () => {
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
        tenantId: "tenant_2",
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
});

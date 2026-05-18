import { describe, expect, it } from "vitest";
import { devAgentLocalBindingManifest, devAgentServiceManifest } from "../dev-agent/manifests";
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
        requirement: "devAgentService"
      })
    ).resolves.toMatchObject({
      provider: "core",
      serviceId: devAgentServiceManifest.id
    });
  });
});

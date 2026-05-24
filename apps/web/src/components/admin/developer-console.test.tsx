import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { DeveloperConsole } from "./developer-console";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock
  })
}));

describe("DeveloperConsole manifest registry", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockImplementation((url: string) => {
      if (url === "/api/auth/me") {
        return Promise.resolve(
          Response.json({
            actor: {
              actorId: "local:admin",
              username: "admin",
              email: "admin@pico.ai",
              groups: ["picoai", "app_admin"]
            }
          })
        );
      }
      if (url === "/api/platform/context") {
        return Promise.resolve(
          Response.json({
            scope: {
              workspaceId: "workspace_picoai",
              projectId: "project_dev_agent"
            },
            actor: {
              actorId: "local:admin",
              email: "admin@pico.ai"
            }
          })
        );
      }
      if (url === "/api/platform/oauth-apps") {
        return Promise.resolve(Response.json({ apps: [] }));
      }
      if (url === "/api/platform/capabilities") {
        return Promise.resolve(Response.json({ capabilities: [] }));
      }
      if (url === "/api/platform/apps") {
        return Promise.resolve(
          Response.json({
            apps: [
              {
                id: "pico.dev-agent",
                packageName: "@pico/dev-agent",
                name: "Dev agent",
                version: 1,
                visibility: { access: "internal" },
                objects: [{ objectId: "conversation", schema: "./schemas/conversation.json" }],
                actions: [{ actionId: "generate_reply", uses: "@pico/dev-agent-service@1.0.0" }],
                views: [{ viewId: "conversation", resource: "ui://pico/dev-agent/conversation" }]
              }
            ]
          })
        );
      }
      if (url === "/api/platform/services") {
        return Promise.resolve(
          Response.json({
            services: [
              {
                serviceId: "pico.service.dev-agent",
                manifest: {
                  id: "pico.service.dev-agent",
                  packageName: "@pico/dev-agent-service",
                  name: "Dev agent service",
                  version: 1
                },
                lifecycleState: "published"
              }
            ]
          })
        );
      }
      if (url === "/api/platform/bindings") {
        return Promise.resolve(
          Response.json({
            bindings: [
              {
                bindingId: "binding_1",
                manifestId: "pico.binding.dev-agent.local",
                scope: {
                  workspaceId: "workspace_picoai",
                  projectId: "project_dev_agent"
                },
                environment: "local",
                requirement: "languageModel",
                provider: "openai",
                model: "gpt-5.2"
              }
            ]
          })
        );
      }
      if (url === "/api/platform/runtime/runs") {
        return Promise.resolve(Response.json({ runs: [], usage: [], memory: [], artifacts: [] }));
      }
      if (url === "/api/platform/manifests") {
        return Promise.resolve(
          Response.json({
            manifests: [
              {
                manifestId: "manifest_1",
                resourceId: "pico.dev-agent.agent",
                kind: "pico.agent",
                scope: {
                  workspaceId: "workspace_picoai",
                  projectId: "project_dev_agent"
                },
                version: 1,
                lifecycleState: "active"
              }
            ]
          })
        );
      }

      return Promise.reject(new Error(`Unhandled url: ${url}`));
    });

    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("renders manifest registry entries from control-plane read path", async () => {
    render(<DeveloperConsole />);

    await waitFor(() => {
      expect(screen.getByText("Control Plane")).toBeInTheDocument();
    });

    expect(screen.getByText("Dev agent")).toBeInTheDocument();
    expect(screen.getByText("@pico/dev-agent · v1")).toBeInTheDocument();
    expect(screen.getByText("languageModel")).toBeInTheDocument();
    expect(screen.getByText("pico.agent")).toBeInTheDocument();
    expect(
      screen.getByText("id: pico.dev-agent.agent · version: 1 · lifecycle: active")
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("workspace:workspace_picoai · project:project_dev_agent").length
    ).toBeGreaterThan(0);
  });
});

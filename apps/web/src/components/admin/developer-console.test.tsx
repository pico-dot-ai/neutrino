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
              username: "admin",
              email: "admin@pico.ai",
              groups: ["picoai", "app_admin"]
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
      if (url === "/api/platform/runtime/runs") {
        return Promise.resolve(Response.json({ runs: [], usage: [] }));
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
      expect(screen.getByText("Manifest Registry")).toBeInTheDocument();
    });

    expect(screen.getByText("pico.agent")).toBeInTheDocument();
    expect(
      screen.getByText("id: pico.dev-agent.agent · version: 1 · lifecycle: active")
    ).toBeInTheDocument();
    expect(
      screen.getByText("workspace:workspace_picoai · project:project_dev_agent")
    ).toBeInTheDocument();
  });
});

import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { DeveloperConsole } from "./developer-console";

const pushMock = vi.fn();
const replaceMock = vi.fn();
const search = { value: "" };

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock
  }),
  usePathname: () => "/admin",
  useSearchParams: () =>
    ({
      get: (key: string) => {
        const params = new URLSearchParams(search.value);
        return params.get(key);
      },
      toString: () => search.value
    }) as URLSearchParams
}));

describe("DeveloperConsole", () => {
  const fetchMock = vi.fn();

  function responseJson(value: unknown) {
    return Promise.resolve(Response.json(value));
  }

  beforeEach(() => {
    search.value = "";
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url === "/api/auth/me") {
        return responseJson({
          actor: {
            actorId: "local:admin",
            username: "admin",
            email: "admin@pico.ai",
            groups: ["picoai", "app_admin"]
          }
        });
      }
      if (url === "/api/platform/context") {
        return responseJson({
          scope: {
            workspaceId: "workspace_picoai",
            projectId: "project_dev_agent"
          },
          actor: {
            actorId: "local:admin",
            email: "admin@pico.ai"
          }
        });
      }
      if (url === "/api/platform/auth/users") {
        return responseJson({
          users: [
            {
              actor: {
                actorId: "ory:user_1",
                workspaceId: "workspace_picoai",
                handle: "user1",
                displayName: "User One",
                email: "user1@pico.ai"
              },
              identities: [
                {
                  identityId: "identity_1",
                  provider: "ory-kratos",
                  externalId: "user_1"
                }
              ],
              grants: [
                {
                  grantId: "grant_1",
                  relation: "can_manage",
                  resourceType: "workspace",
                  resourceId: "workspace_picoai"
                }
              ],
              audit: [
                {
                  auditEventId: "audit_1",
                  action: "auth.signup",
                  resource: "auth-user:ory:user_1",
                  createdAt: "2026-01-01T00:00:01.000Z"
                }
              ],
              lifecycle: {
                hostedIdentityState: "active",
                isManaged: true
              }
            }
          ]
        });
      }
      if (url === "/api/platform/oauth-apps") {
        return responseJson({
          apps: [{ app_id: "oauth_1", displayName: "OAuth One", appType: "provider" }]
        });
      }
      if (url === "/api/platform/capabilities") {
        return responseJson({
          capabilities: [
            {
              capabilityId: "cap_1",
              name: "decision-tracker",
              version: "0.1.0",
              ownerAppId: "oauth_1",
              lifecycleState: "active",
              internalOnly: true
            }
          ]
        });
      }
      if (url === "/api/platform/apps") {
        return responseJson({
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
        });
      }
      if (url === "/api/platform/services") {
        return responseJson({
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
        });
      }
      if (url === "/api/platform/bindings") {
        return responseJson({
          bindings: [
            {
              bindingId: "binding_1",
              manifestId: "pico.binding.dev-agent.local",
              scope: { workspaceId: "workspace_picoai", projectId: "project_dev_agent" },
              environment: "local",
              requirement: "languageModel",
              provider: "openai",
              model: "gpt-5.2"
            }
          ]
        });
      }
      if (url === "/api/platform/runtime/runs") {
        return responseJson({
          runs: [
            {
              run: {
                runId: "run_1",
                status: "succeeded",
                appId: "pico.dev-agent",
                actionId: "generate_reply",
                servicePackageName: "@pico/dev-agent-service",
                startedAt: "2026-01-01T00:00:00.000Z",
                completedAt: "2026-01-01T00:00:01.000Z",
                output: "done"
              },
              traces: [
                { traceId: "trace_1", eventType: "runtime.started", message: "start", createdAt: "2026-01-01T00:00:00.000Z" },
                { traceId: "trace_2", eventType: "runtime.completed", message: "done", createdAt: "2026-01-01T00:00:01.000Z" }
              ]
            }
          ],
          usage: [
            {
              usageId: "usage_1",
              runId: "run_1",
              provider: "language-model",
              model: "gpt-5-mini",
              createdAt: "2026-01-01T00:00:01.000Z"
            }
          ],
          memory: [{ memoryId: "mem_1", kind: "summary", content: "memory item", createdAt: "2026-01-01T00:00:01.000Z" }],
          artifacts: [
            {
              artifactId: "art_1",
              objectUri: "gcs://bucket/runs/run_1/output.txt",
              contentType: "text/plain",
              sizeBytes: 12,
              createdAt: "2026-01-01T00:00:01.000Z"
            }
          ]
        });
      }
      if (url === "/api/platform/manifests") {
        return responseJson({
          manifests: [
            {
              manifestId: "manifest_1",
              resourceId: "pico.dev-agent.agent",
              kind: "pico.agent",
              scope: { workspaceId: "workspace_picoai", projectId: "project_dev_agent" },
              version: 1,
              lifecycleState: "active"
            }
          ]
        });
      }
      if (url === "/api/platform/manifests/register") {
        const body = JSON.parse(String(init?.body ?? "{}")) as { manifest?: { id?: string } };
        return responseJson({
          manifest: {
            manifestId: "manifest_new",
            resourceId: body.manifest?.id ?? "unknown",
            kind: "pico.app",
            scope: { workspaceId: "workspace_picoai", projectId: "project_dev_agent" },
            version: 1,
            lifecycleState: "active"
          }
        });
      }
      if (url === "/api/platform/bindings/register") {
        return responseJson({
          bindings: [
            {
              bindingId: "binding_new",
              manifestId: "manifest_new",
              scope: { workspaceId: "workspace_picoai", projectId: "project_dev_agent" },
              environment: "local",
              requirement: "languageModel",
              provider: "openai",
              model: "gpt-5-mini"
            }
          ]
        });
      }
      if (url === "/api/apps/pico.dev-agent/actions/generate_reply/invoke") {
        return responseJson({
          run: {
            runId: "run_invoked",
            status: "succeeded"
          }
        });
      }
      if (url === "/api/auth/logout") {
        return responseJson({ ok: true });
      }
      if (url === "/api/platform/auth/users/invite") {
        return responseJson({
          user: {
            actor: {
              actorId: "ory:new_user",
              workspaceId: "workspace_picoai",
              handle: "newuser",
              displayName: "newuser",
              email: "newuser@pico.ai"
            },
            identities: [],
            grants: [],
            audit: [],
            lifecycle: {
              hostedIdentityState: "active",
              isManaged: true
            }
          }
        });
      }
      if (
        url === "/api/platform/auth/users/ory%3Auser_1/disable" ||
        url === "/api/platform/auth/users/ory%3Auser_1/reactivate" ||
        url === "/api/platform/auth/users/ory%3Auser_1/password-reset"
      ) {
        return responseJson({ ok: true });
      }
      return Promise.reject(new Error(`Unhandled url: ${url}`));
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("loads overview by default and renders persisted summary", async () => {
    render(<DeveloperConsole />);
    await waitFor(() => expect(screen.getByText("Control Plane")).toBeInTheDocument());
    expect(screen.getByRole("navigation", { name: "Control plane sections" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open control plane sections" })).toBeInTheDocument();
    expect(screen.getByText("Latest run")).toBeInTheDocument();
    expect(screen.getByText("run_1")).toBeInTheDocument();
  });

  it("switches section from query param and supports fallback", async () => {
    search.value = "section=apps";
    render(<DeveloperConsole />);
    await waitFor(() => expect(screen.getByText("App inventory")).toBeInTheDocument());
    expect(screen.getByText("@pico/dev-agent · v1")).toBeInTheDocument();

    search.value = "section=not-real";
    render(<DeveloperConsole />);
    await waitFor(() => expect(screen.getAllByText("Latest run").length).toBeGreaterThan(0));
  });

  it("renders auth section and supports invite flow", async () => {
    search.value = "section=auth";
    render(<DeveloperConsole />);
    await waitFor(() => expect(screen.getByText("Hosted-auth users")).toBeInTheDocument());
    expect(screen.getByText("user1@pico.ai")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Invite email"), {
      target: { value: "newuser@pico.ai" }
    });
    fireEvent.change(screen.getByLabelText("Invite username"), {
      target: { value: "newuser" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Invite User" }));

    await waitFor(() =>
      expect(screen.getByText("Invited newuser@pico.ai.")).toBeInTheDocument()
    );
  });

  it("updates URL when selecting a section", async () => {
    render(<DeveloperConsole />);
    await waitFor(() => expect(screen.getByText("Control Plane")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Apps" }));
    expect(replaceMock).toHaveBeenCalledWith("/admin?section=apps", { scroll: false });
  });

  it("opens mobile section navigation from the header", async () => {
    render(<DeveloperConsole />);
    await waitFor(() => expect(screen.getByText("Control Plane")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Open control plane sections" }));
    const dialog = await screen.findByRole("dialog", { name: "Control plane navigation" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Services" }));

    expect(replaceMock).toHaveBeenCalledWith("/admin?section=services", { scroll: false });
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Control plane navigation" })).not.toBeInTheDocument();
    });
  });

  it("submits structured app manifest payload", async () => {
    search.value = "section=apps";
    render(<DeveloperConsole />);
    await waitFor(() => expect(screen.getByText("App manifest builder")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Register App Manifest" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/platform/manifests/register",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("\"kind\":\"pico.app\"")
        })
      );
    });
  });

  it("submits structured binding payload", async () => {
    search.value = "section=bindings";
    render(<DeveloperConsole />);
    await waitFor(() => expect(screen.getByText("Binding manifest builder")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Register Binding" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/platform/bindings/register",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("\"kind\":\"pico.binding\"")
        })
      );
    });
  });

  it("still supports raw manifest json escape hatch", async () => {
    search.value = "section=manifests";
    render(<DeveloperConsole />);
    await waitFor(() => expect(screen.getByText("Raw manifest JSON (escape hatch)")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Register Raw Manifest" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/platform/manifests/register",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("invokes action from invoke section and shows result status message", async () => {
    search.value = "section=invoke";
    render(<DeveloperConsole />);
    const invokeHeading = await screen.findByRole("heading", { name: "Invoke Dev Agent action" });
    const invokeSection = invokeHeading.closest("section");
    expect(invokeSection).not.toBeNull();
    fireEvent.click(within(invokeSection as HTMLElement).getByRole("button", { name: "Invoke" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/apps/pico.dev-agent/actions/generate_reply/invoke",
        expect.objectContaining({ method: "POST" })
      );
    });
    await waitFor(() => expect(screen.getByText(/Invocation run_invoked finished with succeeded/)).toBeInTheDocument());
  });
});

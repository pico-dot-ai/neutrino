import React from "react";
import { render, screen } from "@testing-library/react";
import { AuthFlowForm } from "./auth-flow-form";

describe("AuthFlowForm", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("renders a hosted flow with fields and submit actions", async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        ui: {
          action: "https://kratos.example.com/self-service/registration",
          method: "POST",
          messages: [{ text: "Complete your registration." }],
          nodes: [
            {
              attributes: {
                name: "csrf_token",
                type: "hidden",
                value: "csrf-123"
              }
            },
            {
              attributes: {
                name: "traits.email",
                required: true,
                type: "email"
              },
              group: "default",
              meta: {
                label: {
                  text: "Email"
                }
              }
            },
            {
              attributes: {
                name: "traits.username",
                type: "text"
              },
              group: "default",
              meta: {
                label: {
                  text: "Username"
                }
              }
            },
            {
              attributes: {
                name: "method",
                type: "submit",
                value: "profile"
              },
              group: "profile",
              meta: {
                label: {
                  text: "Sign up"
                }
              }
            }
          ]
        }
      })
    );

    render(
      <AuthFlowForm
        flowId="flow_123"
        kind="registration"
        kratosPublicUrl="https://kratos.example.com"
      />
    );

    expect(await screen.findByText("Complete your registration.")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign up" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://kratos.example.com/self-service/registration/flows?id=flow_123",
      expect.objectContaining({
        credentials: "include",
        method: "GET"
      })
    );
  });

  it("renders provider-only groups as buttons", async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        ui: {
          action: "https://kratos.example.com/self-service/login",
          method: "POST",
          nodes: [
            {
              attributes: {
                name: "csrf_token",
                type: "hidden",
                value: "csrf-123"
              }
            },
            {
              attributes: {
                name: "provider",
                type: "submit",
                value: "google"
              },
              group: "oidc",
              meta: {
                label: {
                  text: "Continue with Google"
                }
              }
            }
          ]
        }
      })
    );

    render(
      <AuthFlowForm
        flowId="flow_456"
        kind="login"
        kratosPublicUrl="https://kratos.example.com"
      />
    );

    expect(await screen.findByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
  });

  it("renders an error when the hosted flow cannot be loaded", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));

    render(
      <AuthFlowForm
        flowId="flow_err"
        kind="verification"
        kratosPublicUrl="https://kratos.example.com"
      />
    );

    expect(
      await screen.findByText("Unable to load hosted auth flow. Please restart and try again.")
    ).toBeInTheDocument();
  });
});

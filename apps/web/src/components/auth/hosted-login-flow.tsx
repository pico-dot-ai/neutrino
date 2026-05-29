"use client";

import * as React from "react";

type KratosUiNode = {
  attributes?: {
    name?: string;
    type?: string;
    value?: string;
    required?: boolean;
    disabled?: boolean;
  };
  meta?: {
    label?: {
      text?: string;
    };
  };
  group?: string;
};

type KratosLoginFlow = {
  ui?: {
    action?: string;
    method?: string;
    nodes?: KratosUiNode[];
    messages?: Array<{ text?: string }>;
  };
};

export function HostedLoginFlow(props: { kratosPublicUrl: string; flowId: string }) {
  const { kratosPublicUrl, flowId } = props;
  const [flow, setFlow] = React.useState<KratosLoginFlow | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();

    const run = async () => {
      try {
        const url = new URL("/self-service/login/flows", kratosPublicUrl);
        url.searchParams.set("id", flowId);

        const response = await fetch(url.toString(), {
          method: "GET",
          credentials: "include",
          signal: controller.signal
        });

        if (!response.ok) {
          setError("Unable to load hosted sign-in options. Please restart login.");
          return;
        }

        setFlow((await response.json()) as KratosLoginFlow);
      } catch {
        if (!controller.signal.aborted) {
          setError("Unable to load hosted sign-in options. Please restart login.");
        }
      }
    };

    void run();

    return () => controller.abort();
  }, [flowId, kratosPublicUrl]);

  const uiNodes = flow?.ui?.nodes ?? [];
  const hiddenInputs = uiNodes.filter(
    (node) => node.attributes?.type === "hidden" && node.attributes.name
  );
  const oidcButtons = uiNodes.filter(
    (node) =>
      node.group === "oidc" &&
      node.attributes?.type === "submit" &&
      node.attributes.name &&
      node.attributes.value
  );
  const passwordInputs = uiNodes.filter((node) => {
    if (node.group !== "password") {
      return false;
    }

    const type = node.attributes?.type;
    const name = node.attributes?.name;
    return Boolean(
      name && (type === "text" || type === "email" || type === "password" || type === "hidden")
    );
  });
  const passwordSubmit = uiNodes.find(
    (node) =>
      node.group === "password" &&
      node.attributes?.type === "submit" &&
      node.attributes?.name &&
      node.attributes?.value
  );
  const action = flow?.ui?.action;
  const method = (flow?.ui?.method ?? "POST").toUpperCase();
  const flowMessage = flow?.ui?.messages?.[0]?.text;

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (!action) {
    return <p className="text-sm text-muted-foreground">Loading sign-in options...</p>;
  }

  const hasPasswordFlow = passwordInputs.length > 0 && Boolean(passwordSubmit);
  const hasOidcFlow = oidcButtons.length > 0;

  if (!hasPasswordFlow && !hasOidcFlow) {
    return <p className="text-sm text-muted-foreground">Loading sign-in options...</p>;
  }

  return (
    <div className="space-y-4 text-left">
      {flowMessage ? <p className="text-sm text-destructive">{flowMessage}</p> : null}
      {hasPasswordFlow ? (
        <form action={action} method={method} className="space-y-3">
          {hiddenInputs.map((node) => (
            <input
              key={`${node.attributes?.name}-${node.attributes?.value ?? ""}`}
              type="hidden"
              name={node.attributes?.name}
              value={node.attributes?.value ?? ""}
            />
          ))}
          {passwordInputs
            .filter((node) => node.attributes?.type !== "hidden")
            .map((node) => (
              <label key={node.attributes?.name} className="grid gap-1.5">
                <span className="text-xs text-muted-foreground">
                  {node.meta?.label?.text ?? node.attributes?.name}
                </span>
                <input
                  className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
                  autoComplete={node.attributes?.name === "identifier" ? "username" : "current-password"}
                  disabled={node.attributes?.disabled}
                  name={node.attributes?.name}
                  required={node.attributes?.required}
                  type={node.attributes?.type}
                />
              </label>
            ))}
          <button
            className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-foreground px-4 text-sm font-medium text-background transition hover:opacity-90"
            name={passwordSubmit?.attributes?.name}
            type="submit"
            value={passwordSubmit?.attributes?.value}
          >
            {passwordSubmit?.meta?.label?.text ?? "Continue"}
          </button>
        </form>
      ) : null}
      {hasPasswordFlow && hasOidcFlow ? (
        <p className="text-center text-xs uppercase tracking-wide text-muted-foreground">or</p>
      ) : null}
      {hasOidcFlow ? (
        <form action={action} method={method} className="space-y-2">
          {hiddenInputs.map((node) => (
            <input
              key={`oidc-${node.attributes?.name}-${node.attributes?.value ?? ""}`}
              type="hidden"
              name={node.attributes?.name}
              value={node.attributes?.value ?? ""}
            />
          ))}
          {oidcButtons.map((node) => (
            <button
              key={`${node.attributes?.name}-${node.attributes?.value}`}
              className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-accent px-4 text-sm font-medium text-accent-foreground transition hover:bg-accent/90"
              name={node.attributes?.name}
              type="submit"
              value={node.attributes?.value}
            >
              {node.meta?.label?.text ?? node.attributes?.value ?? "Continue"}
            </button>
          ))}
        </form>
      ) : null}
    </div>
  );
}

"use client";

import * as React from "react";

type KratosUiNode = {
  attributes?: {
    name?: string;
    type?: string;
    value?: string;
    required?: boolean;
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
  const action = flow?.ui?.action;
  const method = (flow?.ui?.method ?? "POST").toUpperCase();
  const flowMessage = flow?.ui?.messages?.[0]?.text;

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (!action || oidcButtons.length === 0) {
    return <p className="text-sm text-muted-foreground">Loading sign-in options...</p>;
  }

  return (
    <form action={action} method={method} className="space-y-2">
      {flowMessage ? <p className="text-sm text-destructive">{flowMessage}</p> : null}
      {hiddenInputs.map((node) => (
        <input
          key={`${node.attributes?.name}-${node.attributes?.value ?? ""}`}
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
  );
}

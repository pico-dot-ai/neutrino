"use client";

import * as React from "react";

export type KratosFlowKind =
  | "login"
  | "registration"
  | "recovery"
  | "verification"
  | "settings";

type KratosUiText = {
  text?: string;
};

export type KratosUiNode = {
  attributes?: {
    disabled?: boolean;
    name?: string;
    required?: boolean;
    type?: string;
    value?: string;
  };
  group?: string;
  messages?: KratosUiText[];
  meta?: {
    label?: {
      text?: string;
    };
  };
};

export type KratosSelfServiceFlow = {
  ui?: {
    action?: string;
    method?: string;
    messages?: KratosUiText[];
    nodes?: KratosUiNode[];
  };
};

export function useKratosFlow(options: {
  enabled?: boolean;
  flowId: string;
  kind: KratosFlowKind;
  kratosPublicUrl: string;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const [flow, setFlow] = React.useState<KratosSelfServiceFlow | null>(null);

  React.useEffect(() => {
    if (options.enabled === false) {
      setError(null);
      setFlow(null);
      return;
    }

    const controller = new AbortController();

    async function run() {
      try {
        const url = new URL(`/self-service/${options.kind}/flows`, options.kratosPublicUrl);
        url.searchParams.set("id", options.flowId);

        const response = await fetch(url.toString(), {
          method: "GET",
          credentials: "include",
          signal: controller.signal
        });

        if (!response.ok) {
          setError("Unable to load hosted auth flow. Please restart and try again.");
          return;
        }

        setFlow((await response.json()) as KratosSelfServiceFlow);
      } catch {
        if (!controller.signal.aborted) {
          setError("Unable to load hosted auth flow. Please restart and try again.");
        }
      }
    }

    void run();

    return () => controller.abort();
  }, [options.enabled, options.flowId, options.kind, options.kratosPublicUrl]);

  return {
    error,
    flow,
    isLoading: !error && !flow
  };
}

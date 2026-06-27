"use client";

import { Button } from "@neutrino/ui";
import { AuthFlowNode } from "./auth-flow-node";
import type { KratosFlowKind, KratosUiNode } from "./kratos-flow-client";
import { useKratosFlow } from "./kratos-flow-client";

function groupName(node: KratosUiNode) {
  return node.group ?? "__default";
}

function getNodeText(node: KratosUiNode) {
  return node.meta?.label?.text ?? node.attributes?.value ?? "Continue";
}

function belongsToSubmitGroup(node: KratosUiNode, currentGroup: string) {
  const nodeGroup = groupName(node);
  return (
    nodeGroup === currentGroup ||
    (currentGroup === "profile" && (nodeGroup === "__default" || nodeGroup === "default"))
  );
}

export function AuthFlowForm(props: {
  flowId: string;
  kind: KratosFlowKind;
  kratosPublicUrl: string;
}) {
  const { error, flow, isLoading } = useKratosFlow(props);

  if (error) {
    return (
      <p className="rounded-2xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error}
      </p>
    );
  }

  if (isLoading || !flow?.ui?.action) {
    return <p className="text-sm text-muted-foreground">Loading auth flow…</p>;
  }

  const method = (flow.ui.method ?? "POST").toLowerCase();
  const nodes = flow.ui.nodes ?? [];
  const hiddenInputs = nodes.filter(
    (node) => node.attributes?.type === "hidden" && node.attributes.name
  );
  const submitNodes = nodes.filter(
    (node) =>
      node.attributes?.type === "submit" &&
      node.attributes?.name &&
      node.attributes?.value
  );
  const orderedGroups = [...new Set(submitNodes.map(groupName))];

  return (
    <div className="space-y-4 text-left">
      {flow.ui.messages?.map((message, index) =>
        message.text ? (
          <p
            className="rounded-2xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            key={`flow-message-${index}`}
          >
            {message.text}
          </p>
        ) : null
      )}
      {orderedGroups.map((currentGroup) => {
        const groupInputs = nodes.filter((node) => {
          const type = node.attributes?.type;
          return (
            belongsToSubmitGroup(node, currentGroup) &&
            type !== "hidden" &&
            type !== "submit" &&
            node.attributes?.name
          );
        });
        const groupSubmits = submitNodes.filter((node) => groupName(node) === currentGroup);
        const isProviderOnly = groupInputs.length === 0;

        if (isProviderOnly) {
          return (
            <div className="space-y-2.5" key={currentGroup}>
              {groupSubmits.map((node) => (
                <form action={flow.ui?.action} key={`${currentGroup}-${node.attributes?.value}`} method={method}>
                  {hiddenInputs.map((hiddenNode) => (
                    <input
                      key={`${currentGroup}-${hiddenNode.attributes?.name}-${hiddenNode.attributes?.value ?? ""}`}
                      name={hiddenNode.attributes?.name}
                      type="hidden"
                      value={hiddenNode.attributes?.value ?? ""}
                    />
                  ))}
                  <Button
                  className="h-10 w-full rounded-xl text-sm shadow-sm"
                  name={node.attributes?.name}
                  type="submit"
                  value={node.attributes?.value}
                  variant="secondary"
                >
                  {getNodeText(node)}
                </Button>
                </form>
              ))}
            </div>
          );
        }

        return (
          <form action={flow.ui?.action} className="space-y-3" key={currentGroup} method={method}>
            {hiddenInputs.map((hiddenNode) => (
              <input
                key={`${currentGroup}-${hiddenNode.attributes?.name}-${hiddenNode.attributes?.value ?? ""}`}
                name={hiddenNode.attributes?.name}
                type="hidden"
                value={hiddenNode.attributes?.value ?? ""}
              />
            ))}
            {groupInputs.map((node) => (
              <AuthFlowNode key={`${currentGroup}-${node.attributes?.name}`} node={node} />
            ))}
            <div className="space-y-2">
              {groupSubmits.map((node) => (
                <Button
                  className="h-10 w-full rounded-xl text-sm shadow-sm"
                  key={`${currentGroup}-${node.attributes?.value}`}
                  name={node.attributes?.name}
                  type="submit"
                  value={node.attributes?.value}
                >
                  {getNodeText(node)}
                </Button>
              ))}
            </div>
          </form>
        );
      })}
    </div>
  );
}

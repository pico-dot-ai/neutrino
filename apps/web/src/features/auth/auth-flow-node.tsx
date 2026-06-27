import { Input } from "@neutrino/ui";
import type { KratosUiNode } from "./kratos-flow-client";

function humanizeName(name: string | undefined) {
  if (!name) {
    return "Value";
  }

  return name
    .replace(/^traits\./, "")
    .replace(/[_.-]+/g, " ")
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

function getAutocomplete(name: string | undefined) {
  switch (name) {
    case "identifier":
    case "traits.email":
      return "email";
    case "password":
      return "current-password";
    case "traits.username":
      return "username";
    case "code":
      return "one-time-code";
    default:
      return undefined;
  }
}

export function AuthFlowNode(props: { node: KratosUiNode }) {
  const { node } = props;
  const name = node.attributes?.name;
  const type = node.attributes?.type ?? "text";

  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-medium text-foreground">
        {node.meta?.label?.text ?? humanizeName(name)}
      </span>
      <Input
        autoComplete={getAutocomplete(name)}
        className="h-10 rounded-xl bg-white text-sm shadow-sm"
        defaultValue={node.attributes?.value ?? ""}
        disabled={node.attributes?.disabled}
        name={name}
        required={node.attributes?.required}
        type={type}
      />
      {node.messages?.map((message, index) =>
        message.text ? (
          <span className="text-sm text-destructive" key={`${name ?? "field"}-${index}`}>
            {message.text}
          </span>
        ) : null
      )}
    </label>
  );
}

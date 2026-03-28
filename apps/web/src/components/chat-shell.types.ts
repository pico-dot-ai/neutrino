import type { ChatMessage } from "@neutrino/contracts";

export type LocalMessage = ChatMessage & {
  id: string;
  state?: "streaming" | "complete";
};

export const starterPrompts = [
  "Summarize the Neutrino architecture in one paragraph.",
  "Write a brief product positioning statement for Neutrino.",
  "Explain how the web and API apps are separated in this repo."
];

export function createInitialMessages(): LocalMessage[] {
  return [
    {
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        "Neutrino is ready. Ask the Cloud Run API something to verify the full web-to-backend path.",
      state: "complete"
    }
  ];
}

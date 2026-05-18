export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type GenerateRequest = {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
};

export type GenerateResponse = {
  content: string;
};

export type StreamEvent =
  | {
      type: "delta";
      text: string;
    }
  | {
      type: "done";
      text: string;
    };

export type EmbedRequest = {
  model: string;
  input: string[];
};

export type EmbedResponse = {
  vectors: number[][];
};

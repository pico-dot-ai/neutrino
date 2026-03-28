import OpenAI from "openai";
import type { AIProvider } from "@neutrino/contracts";
import OpenAIAdapter from "../../adapters/ai/openai-adapter.ts";

export function createOpenAIProvider(apiKey: string): AIProvider {
  return new OpenAIAdapter(
    new OpenAI({
      apiKey
    })
  );
}

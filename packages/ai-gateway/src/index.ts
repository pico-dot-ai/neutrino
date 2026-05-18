import OpenAI from "openai";
import type { LanguageModelProvider } from "@neutrino/ports";
import OpenAIAdapter from "../../adapters/ai/openai-adapter.ts";

export function createOpenAILanguageModelProvider(apiKey: string): LanguageModelProvider {
  return new OpenAIAdapter(
    new OpenAI({
      apiKey
    })
  );
}

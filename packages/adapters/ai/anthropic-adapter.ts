import type {
  LanguageModelProvider
} from "@neutrino/ports";
import type {
  GenerateRequest,
  GenerateResponse,
  StreamEvent
} from "@neutrino/schema";

export class AnthropicAdapter implements LanguageModelProvider {
  async generate(_request: GenerateRequest): Promise<GenerateResponse> {
    throw new Error("Not implemented.");
  }

  async *stream(_request: GenerateRequest): AsyncIterable<StreamEvent> {
    throw new Error("Not implemented.");
  }
}

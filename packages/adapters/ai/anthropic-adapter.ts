import type {
  AIProvider,
  EmbedRequest,
  EmbedResponse,
  GenerateRequest,
  GenerateResponse,
  StreamEvent
} from "../../contracts/src/ai-provider";

export class AnthropicAdapter implements AIProvider {
  async generate(_request: GenerateRequest): Promise<GenerateResponse> {
    throw new Error("Not implemented.");
  }

  async embed(_request: EmbedRequest): Promise<EmbedResponse> {
    throw new Error("Not implemented.");
  }

  async *stream(_request: GenerateRequest): AsyncIterable<StreamEvent> {
    throw new Error("Not implemented.");
  }
}

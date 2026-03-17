import type {
  AIProvider,
  EmbedRequest,
  EmbedResponse,
  GenerateRequest,
  GenerateResponse
} from "../../contracts/src/ai-provider";

export class AnthropicAdapter implements AIProvider {
  async generate(_request: GenerateRequest): Promise<GenerateResponse> {
    throw new Error("Not implemented.");
  }

  async embed(_request: EmbedRequest): Promise<EmbedResponse> {
    throw new Error("Not implemented.");
  }
}

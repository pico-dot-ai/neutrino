import type {
  EmbedRequest,
  EmbedResponse,
  GenerateRequest,
  GenerateResponse,
  StreamEvent
} from "@neutrino/schema";

export interface LanguageModelProvider {
  generate(request: GenerateRequest): Promise<GenerateResponse>;
  stream(request: GenerateRequest): AsyncIterable<StreamEvent>;
}

export interface EmbeddingProvider {
  embed(request: EmbedRequest): Promise<EmbedResponse>;
}

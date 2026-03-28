import type {
  AIProvider,
  EmbedRequest,
  EmbedResponse,
  GenerateRequest,
  GenerateResponse,
  StreamEvent
} from "../../contracts/src/ai-provider";
import OpenAI from "openai";

class OpenAIAdapter implements AIProvider {
  constructor(private readonly client: OpenAI) {}

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const response = await this.client.responses.create({
      model: request.model,
      input: request.messages.map((message) => ({
        role: message.role,
        content: message.content
      }))
    });

    return {
      content: response.output_text
    };
  }

  async embed(_request: EmbedRequest): Promise<EmbedResponse> {
    throw new Error("Not implemented.");
  }

  async *stream(request: GenerateRequest): AsyncIterable<StreamEvent> {
    const stream = await this.client.responses.create({
      model: request.model,
      input: request.messages.map((message) => ({
        role: message.role,
        content: message.content
      })),
      stream: true
    });

    let finalText = "";

    for await (const event of stream) {
      if (event.type === "response.output_text.delta") {
        finalText += event.delta;
        yield {
          type: "delta",
          text: event.delta
        };
      }

      if (event.type === "response.completed") {
        yield {
          type: "done",
          text: event.response.output_text || finalText
        };
      }
    }
  }
}

export { OpenAIAdapter };
export default OpenAIAdapter;

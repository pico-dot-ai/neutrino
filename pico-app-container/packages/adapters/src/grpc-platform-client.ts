import type { PlatformCapabilityClient } from "@pico-app/ports";

export class GrpcPlatformClient implements PlatformCapabilityClient {
  constructor(
    private readonly endpoint: string,
    private readonly tokenProvider: () => Promise<string>
  ) {}

  async callCapability<TRequest, TResponse>(options: {
    capability: string;
    version: string;
    context: {
      pico_app_id: string;
      environment: string;
      scopes: string[];
    };
    payload: TRequest;
  }): Promise<TResponse> {
    const token = await this.tokenProvider();

    throw new Error(
      `Implement gRPC transport to ${this.endpoint} using token ${token.slice(0, 4)}... for capability ${options.capability}@${options.version}.`
    );
  }
}

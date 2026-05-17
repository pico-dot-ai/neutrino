export type PlatformRequestContext = {
  pico_app_id: string;
  environment: string;
  scopes: string[];
};

export interface PlatformCapabilityClient {
  callCapability<TRequest, TResponse>(options: {
    capability: string;
    version: string;
    context: PlatformRequestContext;
    payload: TRequest;
  }): Promise<TResponse>;
}

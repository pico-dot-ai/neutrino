import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  PICO_APP_ID: z.string().min(1),
  PICO_CLIENT_ID: z.string().min(1),
  PICO_CLIENT_SECRET: z.string().min(1),
  NEUTRINO_TOKEN_URL: z.string().url(),
  NEUTRINO_GRPC_ENDPOINT: z.string().min(1)
});

export type ApiEnv = z.infer<typeof envSchema>;

export function loadEnv(env: NodeJS.ProcessEnv = process.env): ApiEnv {
  return envSchema.parse(env);
}

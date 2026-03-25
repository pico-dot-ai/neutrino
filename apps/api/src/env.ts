import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().min(1).default("gpt-5-mini"),
  API_PROXY_SHARED_SECRET: z.string().min(1)
});

export type ApiEnv = z.infer<typeof envSchema>;

export function loadEnv(env: NodeJS.ProcessEnv = process.env): ApiEnv {
  return envSchema.parse(env);
}

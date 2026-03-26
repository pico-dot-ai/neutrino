import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().min(1).default("gpt-5-mini"),
  API_PROXY_SHARED_SECRET: z.string().min(1)
});

export type ApiEnv = z.infer<typeof envSchema>;

export function loadEnv(env: NodeJS.ProcessEnv = process.env): ApiEnv {
  const parsed = envSchema.safeParse(env);

  if (parsed.success) {
    return parsed.data;
  }

  const missingVariables = parsed.error.issues
    .filter((issue) => issue.code === "invalid_type" && issue.path.length === 1)
    .map((issue) => String(issue.path[0]));

  if (missingVariables.length > 0) {
    console.error(
      `Missing required environment variables: ${missingVariables.join(", ")}`
    );
  }

  throw parsed.error;
}

import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().min(1).default("gpt-5-mini"),
  API_PROXY_SHARED_SECRET: z.string().min(1),
  KRATOS_PUBLIC_URL: z.string().url().optional(),
  KRATOS_ADMIN_URL: z.string().url().optional(),
  KRATOS_WEBHOOK_SHARED_SECRET: z.string().min(1).optional(),
  AUTH_SIGNUP_ALLOWED_EMAILS: z.string().default(""),
  AUTH_SIGNUP_ALLOWED_DOMAINS: z.string().default(""),
  AUTH_REQUIRE_VERIFIED_EMAIL: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value !== "false"),
  AUTH_DEFAULT_WORKSPACE_ID: z.string().min(1).default("workspace_picoai"),
  AUTH_INITIAL_GRANT_RELATION: z.string().min(1).default("can_manage"),
  CORE_DATABASE_URL: z.string().min(1).optional(),
  DATABASE_URL: z.string().min(1).optional(),
  OBJECT_STORAGE_PROVIDER: z.enum(["local", "gcs"]).optional(),
  OBJECT_STORAGE_LOCAL_ROOT: z.string().min(1).optional(),
  OBJECT_STORAGE_GCS_BUCKET: z.string().min(1).optional(),
  OBJECT_STORAGE_GCS_PREFIX: z.string().optional()
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

import { z } from "zod";

const serverEnvSchema = z.object({
  API_BASE_URL: z
    .string()
    .url()
    .transform((value) => value.replace(/\/+$/, ""))
    .default("http://127.0.0.1:4000"),
  API_PROXY_SHARED_SECRET: z.string().min(1),
  APP_GATE_USERNAME: z.string().min(1),
  APP_GATE_PASSWORD: z.string().min(1)
});

export function getServerEnv() {
  return serverEnvSchema.parse({
    API_BASE_URL: process.env.API_BASE_URL,
    API_PROXY_SHARED_SECRET: process.env.API_PROXY_SHARED_SECRET,
    APP_GATE_USERNAME: process.env.APP_GATE_USERNAME,
    APP_GATE_PASSWORD: process.env.APP_GATE_PASSWORD
  });
}

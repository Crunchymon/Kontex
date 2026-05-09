import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  GEMINI_API_KEY: z.string().min(1),
  EMBEDDING_MODEL: z.string().min(1).default("gemini-embedding-001"),
  API_KEY_HMAC_SECRET: z.string().min(32, "Must be at least 32 chars of random entropy"),
  PORT: z.string().optional()
});

export type Env = z.infer<typeof envSchema>;

export function getEnv(rawEnv: NodeJS.ProcessEnv = process.env): Env {
  return envSchema.parse(rawEnv);
}

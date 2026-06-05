import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  GEMINI_API_KEY: z.string().min(1),
  EMBEDDING_MODEL: z.string().min(1).default("gemini-embedding-001"),
  CLERK_SECRET_KEY: z.string().min(1, "Clerk Secret Key is required"),
  PORT: z.string().optional()
});

export type Env = z.infer<typeof envSchema>;

export function getEnv(rawEnv: NodeJS.ProcessEnv = process.env): Env {
  return envSchema.parse(rawEnv);
}

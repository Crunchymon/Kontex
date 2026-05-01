import { z } from "zod";

const envSchema = z.object({
  GITHUB_PAT: z.string().min(1),
  REPO_OWNER: z.string().min(1),
  REPO_NAME: z.string().min(1),
  CONTEXT_PATH: z.string().min(1).default("context.txt"),
  PORT: z.string().optional()
});

export type Env = z.infer<typeof envSchema>;

export function getEnv(rawEnv: NodeJS.ProcessEnv = process.env): Env {
  return envSchema.parse(rawEnv);
}

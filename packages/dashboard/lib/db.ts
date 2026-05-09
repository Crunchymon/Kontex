import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@kontex/shared/schema";
import { env } from "./env";

let cached: ReturnType<typeof drizzle> | null = null;

export function db() {
  if (cached) return cached;
  const client = neon(env.DATABASE_URL());
  cached = drizzle(client, { schema, casing: "snake_case" });
  return cached;
}

export type DB = ReturnType<typeof db>;

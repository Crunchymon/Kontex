import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@kontex/shared/schema";

export type Database = ReturnType<typeof createDb>;

export function createDb(databaseUrl: string) {
  const client = neon(databaseUrl);
  return drizzle(client, { schema, casing: "snake_case" });
}

import { createHmac, randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { apiKeys } from "@kontex/shared/schema";
import { db } from "./db";
import { env } from "./env";

export const API_KEY_PREFIX = "kx_";

export function hashApiKey(rawKey: string): string {
  return createHmac("sha256", env.API_KEY_HMAC_SECRET()).update(rawKey).digest("hex");
}

export function generateRawApiKey(prefix: "live" | "session"): string {
  return `${API_KEY_PREFIX}${prefix}_${randomBytes(32).toString("base64url")}`;
}

export async function createUserApiKey(userId: string, name: string): Promise<{ id: string; rawKey: string }> {
  const rawKey = generateRawApiKey("live");
  const [row] = await db()
    .insert(apiKeys)
    .values({
      keyHash: hashApiKey(rawKey),
      userId,
      name,
      source: "user_generated"
    })
    .returning({ id: apiKeys.id });
  return { id: row.id, rawKey };
}

export async function createSessionApiKey(userId: string): Promise<{ id: string; rawKey: string }> {
  const rawKey = generateRawApiKey("session");
  const [row] = await db()
    .insert(apiKeys)
    .values({
      keyHash: hashApiKey(rawKey),
      userId,
      name: "Dashboard session",
      source: "dashboard_session"
    })
    .returning({ id: apiKeys.id });
  return { id: row.id, rawKey };
}

export async function revokeApiKey(apiKeyId: string): Promise<void> {
  await db()
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, apiKeyId), isNull(apiKeys.revokedAt)));
}

export async function revokeUserKey(userId: string, apiKeyId: string): Promise<void> {
  await db()
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(apiKeys.id, apiKeyId),
        eq(apiKeys.userId, userId),
        isNull(apiKeys.revokedAt)
      )
    );
}

import { and, eq } from "drizzle-orm";
import { verifyToken } from "@clerk/backend";
import {
  projectMembers,
  spaceMembers,
  type ProjectRole,
  type SpaceRole,
  type User,
  users,
} from "@kontex/shared/schema";
import type { Database } from "./db.js";
import { KontexError } from "./errors.js";

import { createRemoteJWKSet, jwtVerify } from "jose";

interface AuthContext {
  user: User;
}

export type { AuthContext };

const CLERK_ISSUER = "https://positive-magpie-18.clerk.accounts.dev";

const JWKS = createRemoteJWKSet(
  new URL(`${CLERK_ISSUER}/.well-known/jwks.json`),
);

export async function authenticate(
  db: Database,
  rawKey: string | undefined,
  clerkSecretKey: string, // currently unused
): Promise<AuthContext> {
  if (!rawKey) {
    throw new KontexError("missing_auth", "Missing Authorization header");
  }

  const token = rawKey.replace(/^Bearer\s+/i, "").trim();

  let clerkUserId: string;

  try {
    const decoded = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString(),
    );

    console.log("RAW TOKEN PAYLOAD", decoded);

    const { payload, protectedHeader } = await jwtVerify(token, JWKS, {
      issuer: CLERK_ISSUER,
    });

    console.log("VERIFIED PAYLOAD", payload);

    clerkUserId = String(payload.sub);
  } catch (err) {
    console.error("JWT VERIFY ERROR", {
      name: err?.constructor?.name,
      message: err instanceof Error ? err.message : String(err),
    });

    throw new KontexError("invalid_token", "Invalid or expired token");
  }

  const [userRow] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkUserId))
    .limit(1);

  if (!userRow) {
    console.error("USER NOT FOUND", {
      clerkUserId,
    });

    throw new KontexError("user_not_found", "User not found in database");
  }

  return {
    user: userRow,
  };
}

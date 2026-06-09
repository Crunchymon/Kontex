import { createHash, randomUUID } from "node:crypto";
import express, { type Request, type Router } from "express";
import { eq } from "drizzle-orm";
import { oauthClients, oauthCodes, oauthTokens } from "@kontex/shared/schema";
import type { Database } from "./db.js";

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 24;

function requestOrigin(req: Request): string {
  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = req.get("x-forwarded-host")?.split(",")[0]?.trim();
  const proto = forwardedProto || req.protocol;
  const host = forwardedHost || req.get("host");
  return `${proto}://${host}`;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function normalizeClientName(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "Claude";
}

function safeRedirectUri(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.toString();
  } catch {
    return null;
  }
}

function appendOAuthParams(redirectUri: string, params: Record<string, string>): string {
  const url = new URL(redirectUri);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

function createS256Challenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function createOAuthRouter(db: Database, dashboardUrl: string): Router {
  const router = express.Router();

  router.get("/.well-known/oauth-authorization-server", (req, res) => {
    const base = requestOrigin(req);
    res.json({
      issuer: base,
      authorization_endpoint: `${base}/oauth/authorize`,
      token_endpoint: `${base}/oauth/token`,
      registration_endpoint: `${base}/oauth/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code"],
      token_endpoint_auth_methods_supported: ["client_secret_post", "none"],
      code_challenge_methods_supported: ["S256"]
    });
  });

  router.post("/oauth/register", async (req, res) => {
    const rawRedirectUris: string[] = isStringArray(req.body?.redirect_uris) ? req.body.redirect_uris : [];
    const normalizedRedirectUris = rawRedirectUris.map((uri: string) => safeRedirectUri(uri));
    if (normalizedRedirectUris.some((uri: string | null) => !uri)) {
      res.status(400).json({ error: "invalid_redirect_uri" });
      return;
    }
    const redirectUris = normalizedRedirectUris as string[];

    const clientId = randomUUID();
    const clientSecret = randomUUID();
    const clientName = normalizeClientName(req.body?.client_name);

    await db.insert(oauthClients).values({
      clientId,
      clientSecret,
      clientName,
      redirectUris
    });

    res.status(201).json({
      client_id: clientId,
      client_secret: clientSecret,
      client_name: clientName,
      redirect_uris: redirectUris,
      grant_types: ["authorization_code"],
      response_types: ["code"]
    });
  });

  router.get("/oauth/authorize", async (req, res) => {
    const clientId = String(req.query.client_id ?? "");
    const redirectUri = safeRedirectUri(req.query.redirect_uri);
    const state = typeof req.query.state === "string" ? req.query.state : undefined;
    const codeChallenge = String(req.query.code_challenge ?? "");
    const codeChallengeMethod = String(req.query.code_challenge_method ?? "");
    const responseType = String(req.query.response_type ?? "code");

    if (!clientId || !redirectUri || !codeChallenge || codeChallengeMethod !== "S256" || responseType !== "code") {
      res.status(400).json({ error: "invalid_request" });
      return;
    }

    const [client] = await db
      .select()
      .from(oauthClients)
      .where(eq(oauthClients.clientId, clientId))
      .limit(1);

    if (!client || !client.redirectUris.includes(redirectUri)) {
      res.status(400).json({ error: "invalid_client" });
      return;
    }

    const url = new URL("/oauth/authorize", dashboardUrl);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("code_challenge", codeChallenge);
    url.searchParams.set("code_challenge_method", codeChallengeMethod);
    if (state) url.searchParams.set("state", state);

    res.redirect(url.toString());
  });

  router.post("/oauth/token", async (req, res) => {
    const grantType = String(req.body?.grant_type ?? "");
    const code = String(req.body?.code ?? "");
    const clientId = String(req.body?.client_id ?? "");
    const clientSecret = typeof req.body?.client_secret === "string" ? req.body.client_secret : undefined;
    const redirectUri = safeRedirectUri(req.body?.redirect_uri);
    const codeVerifier = String(req.body?.code_verifier ?? "");

    if (grantType !== "authorization_code" || !code || !clientId || !redirectUri || !codeVerifier) {
      res.status(400).json({ error: "invalid_request" });
      return;
    }

    const [client] = await db
      .select()
      .from(oauthClients)
      .where(eq(oauthClients.clientId, clientId))
      .limit(1);

    if (!client || (clientSecret && client.clientSecret !== clientSecret)) {
      res.status(401).json({ error: "invalid_client" });
      return;
    }

    const [codeRow] = await db
      .select()
      .from(oauthCodes)
      .where(eq(oauthCodes.code, code))
      .limit(1);

    if (
      !codeRow ||
      codeRow.clientId !== clientId ||
      codeRow.redirectUri !== redirectUri ||
      codeRow.expiresAt < new Date()
    ) {
      res.status(400).json({ error: "invalid_grant" });
      return;
    }

    const challenge = createS256Challenge(codeVerifier);
    if (challenge !== codeRow.codeChallenge) {
      res.status(400).json({ error: "invalid_grant" });
      return;
    }

    const accessToken = randomUUID();
    await db.insert(oauthTokens).values({
      token: accessToken,
      userId: codeRow.userId,
      clientId,
      expiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000)
    });
    await db.delete(oauthCodes).where(eq(oauthCodes.code, code));

    res.json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_TTL_SECONDS
    });
  });

  return router;
}

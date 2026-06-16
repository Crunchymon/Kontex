import express, { type Request, type Response } from "express";
import cors from "cors";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { createServer } from "./server.js";
import { getEnv } from "./env.js";
import { createDb } from "./db.js";
import { createEmbeddingClient } from "./embeddings.js";
import { authenticate } from "./auth.js";
import { KontexError } from "./errors.js";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

const env = getEnv();
const db = createDb(env.DATABASE_URL);
const embeddings = createEmbeddingClient(
  env.GEMINI_API_KEY,
  env.EMBEDDING_MODEL,
);

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false }));
// Allow cross-origin requests from the dashboard host so browser-based
// dynamic client registration can succeed (preflight OPTIONS included).
const allowedOrigins = [env.DASHBOARD_URL, "https://claude.ai" , "https://chatgpt.com"];
app.use(
  cors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);


function logRequest(stage: string, req: Request, extra: Record<string, unknown> = {}) {
  console.log(
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        stage,
        method: req.method,
        path: req.originalUrl,
        host: req.headers.host,
        forwardedHost: req.headers["x-forwarded-host"],
        forwardedProto: req.headers["x-forwarded-proto"],
        userAgent: req.headers["user-agent"],
        authorization: req.headers.authorization
          ? `${req.headers.authorization.slice(0, 25)}...`
          : null,
        mcpProtocolVersion: req.headers["mcp-protocol-version"],
        cfRay: req.headers["cf-ray"],
        ip:
          req.headers["cf-connecting-ip"] ||
          req.headers["x-forwarded-for"] ||
          req.ip,
        ...extra,
      },
      null,
      2,
    ),
  );
}

app.get("/.well-known/oauth-authorization-server", async (_req, res) => {
  logRequest("oauth_authorization_server", _req);
  try {
    const clerkBase = env.CLERK_FRONTEND_API_URL.replace(/\/$/, "");

    const response = await fetch(
      `${clerkBase}/.well-known/openid-configuration`
    );

    if (!response.ok) {
      return res.status(500).json({
        error: "failed_to_fetch_clerk_metadata",
      });
    }

    const metadata = await response.json();

    return res.json(metadata);
  } catch (error) {
    console.error("OAuth discovery error", error);

    return res.status(500).json({
      error: "oauth_discovery_failed",
    });
  }
});


app.get("/.well-known/oauth-protected-resource", (req, res) => {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";

  const payload = {
    resource: `${proto}://${host}/sse`,
    authorization_servers: [
      env.CLERK_FRONTEND_API_URL.replace(/\/$/, ""),
    ],
    scopes_supported: [
      "openid",
      "profile",
      "email",
      "offline_access",
    ],
  };

  logRequest("oauth_protected_resource", req, payload);

  res.json(payload);
});

app.get("/healthz", (_req, res) => {
  res.status(200).send("ok");
});

const connections = new Map<
  string,
  { transport: SSEServerTransport; server: McpServer }
>();

app.get("/sse", async (req: Request, res: Response) => {
  console.log("Incoming SSE connection", req);

  try {
    const auth = req.headers.authorization ?? req.headers.Authorization;
    const apiKey = Array.isArray(auth) ? auth[0] : auth;
    const ctx = await authenticate(db, apiKey, env.CLERK_SECRET_KEY);

    const transport = new SSEServerTransport("/message", res);
    const server = createServer({ db, embeddings, ctx });

    connections.set(transport.sessionId, { transport, server });

    transport.onclose = () => {
      connections.delete(transport.sessionId);
    };

    await server.connect(transport);
  } catch (err) {
    console.log("SSE connection error", err);
    if (res.headersSent) return;
    
    if (err instanceof KontexError) {
      // 1. Force a strict 401 status for all authentication-related errors
      const isAuthError = ["missing_auth", "invalid_token", "user_not_found"].includes(err.code);
      const statusCode = isAuthError ? 401 : err.status;
      
      // 2. Inject the mandatory RFC 9728 header required by Claude
      if (statusCode === 401) {
        const host = req.headers["x-forwarded-host"] || req.headers.host;
        const proto = req.headers["x-forwarded-proto"] || "https";
        res.setHeader(
          "WWW-Authenticate", 
          `Bearer resource_metadata="${proto}://${host}/.well-known/oauth-protected-resource"`
        );
      }

      res.status(statusCode).json({
        error: err.code,
        message: err.message,
        details: err.details ?? null
      });
      return;
    }
    
    // eslint-disable-next-line no-console
    console.error("Unhandled SSE connect error", err);
    res.status(500).json({ error: "internal", message: "Unexpected server error" });
  }
});

app.post("/message", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  if (!sessionId) {
    res.status(400).send("Missing sessionId");
    return;
  }

  const connection = connections.get(sessionId);
  if (!connection) {
    res.status(404).send("Session not found");
    return;
  }

  try {
    await connection.transport.handlePostMessage(req, res, req.body);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Message handling error", err);
    if (!res.headersSent) {
      res.status(500).send("Message handling error");
    }
  }
});

const port = Number(env.PORT ?? 3001);

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Kontex MCP server listening on ${port}`);
});

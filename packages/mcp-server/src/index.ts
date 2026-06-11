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
import { createOAuthRouter } from "./oauth.js";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

const env = getEnv();
const db = createDb(env.DATABASE_URL);
const embeddings = createEmbeddingClient(env.GEMINI_API_KEY, env.EMBEDDING_MODEL);

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false }));
// Allow cross-origin requests from the dashboard host so browser-based
// dynamic client registration can succeed (preflight OPTIONS included).
const allowedOrigins = [env.DASHBOARD_URL , "https://claude.ai"];
app.use(
  cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(createOAuthRouter(db, env.DASHBOARD_URL));

app.get("/healthz", (_req, res) => {
  res.status(200).send("ok");
});

const connections = new Map<string, { transport: SSEServerTransport; server: McpServer }>();

app.get("/sse", async (req: Request, res: Response) => {
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
    if (res.headersSent) return;
    if (err instanceof KontexError) {
      res.status(err.status).json({
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

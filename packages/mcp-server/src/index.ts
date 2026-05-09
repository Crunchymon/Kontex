import express, { type Request, type Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
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
const embeddings = createEmbeddingClient(env.GEMINI_API_KEY, env.EMBEDDING_MODEL);

const app = express();
app.use(express.json({ limit: "2mb" }));

app.get("/healthz", (_req, res) => {
  res.status(200).send("ok");
});

app.post("/mcp", async (req: Request, res: Response) => {
  try {
    const auth = req.headers.authorization ?? req.headers.Authorization;
    const apiKey = Array.isArray(auth) ? auth[0] : auth;
    const ctx = await authenticate(db, apiKey, env.API_KEY_HMAC_SECRET);

    const server = createServer({ db, embeddings, ctx });
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
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
    console.error("Unhandled MCP error", err);
    res.status(500).json({ error: "internal", message: "Unexpected server error" });
  }
});

const port = Number(env.PORT ?? 3001);

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Kontex MCP server listening on ${port}`);
});

# Kontex MVP V2

Institutional memory infrastructure for AI-native teams. Vector-searchable shared context behind a human approval gate, reachable from any LLM that speaks MCP.

## Packages

- `packages/shared` — Drizzle schema, Zod tool schemas, shared TypeScript contracts.
- `packages/mcp-server` — Express + `@modelcontextprotocol/sdk` host running 8 tools over Streamable HTTP.
- `packages/dashboard` — Next.js 14 app with NextAuth (Google), the Stitch design system, and the MCP control plane.

## Architecture

- One Postgres database per deployment (Neon, with the `vector` extension).
- The MCP server is the only thing that touches the database.
- The dashboard is just another MCP client. It calls the same tools your LLM does, with a session-scoped API key generated silently on Google sign-in.

## The 8 MCP tools

| Tool | Reads / writes | Required role |
| --- | --- | --- |
| `query_context` | reads | space reader+ |
| `get_entry` | reads | space reader+ |
| `list_recent` | reads | space reader+ |
| `list_pending` | reads | space editor (per space) |
| `propose_entry` | writes (pending) | space editor |
| `propose_edit` | writes (pending) | space editor |
| `propose_archive` | writes (pending) | space editor |
| `resolve_change` | applies a pending change | space editor |

Every entry is hard-capped at 1500 characters at the tool level. Entries that exceed the cap are rejected before touching the database, with an actionable error so the LLM can split the content.

## Environment

### `packages/mcp-server/.env`

```
DATABASE_URL=postgresql://user:password@host/dbname
GEMINI_API_KEY=<google-ai-studio-key>
EMBEDDING_MODEL=text-embedding-004
API_KEY_HMAC_SECRET=<32+ chars of random base64>
PORT=3001
```

Embeddings are produced by Google's [`text-embedding-004`](https://ai.google.dev/gemini-api/docs/embeddings) at 768 dimensions, which is free-tier on AI Studio (no card required). Grab a key at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey). The MCP server requests `outputDimensionality=768` and `taskType=RETRIEVAL_DOCUMENT` for every entry.

### `packages/dashboard/.env`

```
MCP_SERVER_URL=http://localhost:3001
DATABASE_URL=postgresql://user:password@host/dbname
API_KEY_HMAC_SECRET=<must match mcp-server>
AUTH_SECRET=<openssl rand -base64 32>
AUTH_GOOGLE_ID=<google-oauth-client-id>
AUTH_GOOGLE_SECRET=<google-oauth-client-secret>
AUTH_TRUST_HOST=true
NEXTAUTH_URL=http://localhost:3000
```

`API_KEY_HMAC_SECRET` must be identical between the two services. The dashboard mints raw keys and stores their HMAC-SHA-256 digest; the MCP server hashes the incoming `Authorization: Bearer ...` value with the same secret to look the key up.

## Run locally

```bash
pnpm install
pnpm test
pnpm build

# in one terminal
pnpm --filter @kontex/mcp-server dev

# in another
pnpm --filter @kontex/dashboard dev
```

## Database setup

The schema lives in `packages/shared/src/schema/`. Drizzle is wired through the MCP server.

```bash
# generate migrations after schema changes
pnpm --filter @kontex/mcp-server db:generate

# apply against the configured DATABASE_URL
pnpm --filter @kontex/mcp-server db:migrate
```

For a fresh database also run, once, against your Neon instance:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

If you migrated an earlier build that created `entries.embedding` at `vector(1536)` — pgvector cannot auto-cast a column to a different dimensionality, so the safest path is to truncate and re-create the column (`entries` is empty until `resolve_change` is called, so no data is lost):

```sql
TRUNCATE entries CASCADE;
ALTER TABLE entries ALTER COLUMN embedding TYPE vector(768);
```

Alternatively, drop the `entries` table and re-run `pnpm --filter @kontex/mcp-server db:push`.

## Connecting an LLM client

### Claude Desktop

Claude's native Custom Connectors UI does **not** yet accept static bearer tokens — it only supports OAuth shapes. The standard workaround is the [`mcp-remote`](https://github.com/geelen/mcp-remote) stdio bridge.

1. Generate a key on the `Keys` page. The page shows a copy-pasteable snippet — paste it into:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%/Claude/claude_desktop_config.json`
2. Restart Claude Desktop.
3. The Kontex MCP tools appear in the Claude tool list. Each tool call sends `Authorization: Bearer <your key>` to the MCP server.

The snippet has the shape:

```json
{
  "mcpServers": {
    "kontex": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://your-mcp-host/mcp",
        "--header",
        "Authorization:Bearer kx_live_..."
      ]
    }
  }
}
```

## Logo asset

The Stitch design references the wordmark at a Google CDN URL that is ephemeral. To replace the placeholder mark used in the sidebar header and footer, drop `kontex-logo.svg` (or `.png`) into `packages/dashboard/public/` and update [`packages/dashboard/components/Logo.tsx`](packages/dashboard/components/Logo.tsx) to render it.

## Not in scope (V2 MVP)

- Chunking or chunk-level retrieval
- Notifications, triggers, automations
- Drift / conflict detection
- Cross-project querying from MCP tools
- OAuth on the MCP server (post-MVP — would unlock Claude's native Custom Connectors UI)
- Mobile

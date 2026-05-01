# Kontex MVP V1

Kontex MVP is a thin governance layer on top of GitHub for a single text context file.

## Packages

- `packages/mcp-server`: MCP server exposing six tools for context and PR workflows.
- `packages/dashboard`: Next.js dashboard that talks to the MCP server through an internal API proxy.
- `packages/shared`: shared TypeScript contracts used by both packages.

## Environment

### MCP server

- `GITHUB_PAT`
- `REPO_OWNER`
- `REPO_NAME`
- `CONTEXT_PATH` (optional, defaults to `context.txt`)
- `PORT` (optional)

### Dashboard

- `MCP_SERVER_URL`

## Run locally

```bash
pnpm install
pnpm test
pnpm build
```

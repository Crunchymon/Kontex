# Kontex Decision Log

## 0) Why this file exists

This file is the living context for the Kontex codebase itself: what exists, why it exists, and what is intentionally missing in MVP V1. It is designed so a new maintainer (human or agent) can recover the full implementation model quickly without reading the whole repository first.

## 1) Confirmed product decisions (with rationale)

- No dashboard auth in MVP.
  - Why: first-user, single-tenant dogfooding speed beats hardening.
  - Consequence: possession of dashboard URL implies action capability; acceptable for MVP only.
- MCP transport is Streamable HTTP only.
  - Why: current MCP recommendation and smallest surface area.
  - Consequence: no SSE compatibility layer in this version.
- Six tools only; rollback uses `read_context({ sha })` instead of adding a 7th tool.
  - Why: preserves strict MVP tool boundary while still enabling history snapshot reads.
- Branch naming format `kontex/<iso_timestamp_sanitized>`.
  - Why: deterministic namespace and easy filtering in list/history.
- PR merge method is squash.
  - Why: keeps `main` context history linear and rollback-friendly.
- MCP server is stateless per request.
  - Why: every operation is a one-shot GitHub API action; no session memory needed.
- Dashboard communicates via MCP SDK (not direct GitHub API, not a custom REST backend).
  - Why: dogfoods the same protocol agents use and keeps dashboard free of GitHub credentials.

## 2) Repository layout and ownership map

- Root
  - `package.json`: workspace scripts (`build`, `typecheck`, `test`, `lint`) run through `corepack pnpm`.
  - `pnpm-workspace.yaml`: workspace package discovery (`packages/*`).
  - `tsconfig.base.json`: strict TS defaults reused by all packages.
  - `.github/workflows/ci.yml`: CI pipeline (install -> typecheck -> test -> build).
  - `README.md`: usage/setup summary.
  - `decision.md`: this document.
- `packages/shared`
  - Purpose: source of truth for tool names, tool input/output maps, and shared DTOs.
  - Primary file: `packages/shared/src/index.ts`.
- `packages/mcp-server`
  - Purpose: GitHub integration + MCP tool runtime.
  - Primary files: `src/env.ts`, `src/github.ts`, `src/tools/*`, `src/server.ts`, `src/index.ts`.
- `packages/dashboard`
  - Purpose: human review UI and MCP proxy.
  - Primary files: `app/api/mcp/route.ts`, `lib/mcp-server-client.ts`, `lib/mcp-client.ts`, pages/components.

## 3) MCP server implementation details

### 3.1 Environment contract (`packages/mcp-server/src/env.ts`)

- Source-of-truth rule:
  - Env variable names and requirement level come from package runtime contract code (`env.ts`).
  - Package-local `.env` files provide local development values for that contract and may omit optional/defaulted keys.
- MCP server schema:
  - `GITHUB_PAT: string (required)`
  - `REPO_OWNER: string (required)`
  - `REPO_NAME: string (required)`
  - `CONTEXT_PATH: string (default "context.txt")`
  - `PORT: string | undefined (optional)`
- Local value source:
  - `packages/mcp-server/.env` currently provides values for `GITHUB_PAT`, `REPO_OWNER`, and `REPO_NAME`.
- Validation strategy: zod parse at runtime.
- Failure mode: process throws on startup if required env is missing/empty.

### 3.2 GitHub boundary (`packages/mcp-server/src/github.ts`)

- `createGitHubClient(env) -> { octokit, owner, repo, contextPath }`
- `getContext(client, ref="main") -> { content, sha }`
  - Uses `repos.getContent` and base64 decode.
  - Throws if response is directory-like instead of file-like.
- `raisePr(client, proposedContent, description) -> { pr_number, pr_url, branch_name }`
  - Gets `main` head SHA.
  - Creates `refs/heads/kontex/<timestamp>`.
  - Updates context file on new branch with `createOrUpdateFileContents`.
  - Opens PR to `main` with title/body derived from description.
- `listPrs(client) -> OpenPr[]`
  - Lists open PRs, filters `head.ref.startsWith("kontex/")`.
  - Fetches `base_content` and `head_content` by PR SHAs.
- `mergePr(client, prNumber) -> { merged: true, sha }`
  - Uses `pulls.merge` with `merge_method: "squash"`.
- `closePr(client, prNumber) -> { closed: true }`
  - Uses `pulls.update` with `state: "closed"`.
- `getHistory(client) -> HistoryEntry[]`
  - Lists closed PRs, filters merged `kontex/` branches, sorts descending by `merged_at`.

### 3.3 Tool surface (`packages/mcp-server/src/tools`)

- `read_context`
  - Input schema: `z.object({ sha: z.string().optional() })`
  - Output: `{ content: string; sha: string }`
  - Handler: delegates to `getContext(client, input.sha ?? "main")`.
- `raise_pr`
  - Input schema: `z.object({ proposed_content: z.string(), description: z.string().min(1) })`
  - Output: `{ pr_number: number; pr_url: string; branch_name: string }`
  - Handler: delegates to `raisePr(...)`.
- `list_prs`
  - Input schema: `z.object({})`
  - Output element: `{ pr_number, title, description, base_content, head_content, created_at }`
- `merge_pr`
  - Input schema: `z.object({ pr_number: z.number().int().positive() })`
  - Output: `{ merged: true; sha: string }`
- `close_pr`
  - Input schema: `z.object({ pr_number: z.number().int().positive() })`
  - Output: `{ closed: true }`
- `get_history`
  - Input schema: `z.object({})`
  - Output element: `{ pr_number, description, merged_at, sha }`

### 3.4 MCP registration/runtime (`packages/mcp-server/src/server.ts`, `src/index.ts`)

- `createServer()` builds an `McpServer` and registers exactly six tools.
- Tool outputs are normalized to MCP text content by JSON-stringifying result payloads.
- Current typing workaround: `(server as any).registerTool(...)` is used due to generic mismatch with strict TS setup.
- HTTP server:
  - `POST /mcp`: creates server+transport per request and handles Streamable HTTP call.
  - `GET /healthz`: returns `"ok"`.
  - Transport config is stateless via `sessionIdGenerator: undefined`.

## 4) Dashboard implementation details

### 4.1 Proxy boundary (`packages/dashboard/app/api/mcp/route.ts`)

- Input from browser: `{ tool: string, input: unknown }`.
- Server-side call path: `callMcpToolServer(tool, input)` via MCP SDK client.
- Decoding strategy: reads first text content item, parses JSON.
- Response contract:
  - success: `{ ok: true, result }`
  - failure: `{ ok: false, error }` with status `500`

### 4.2 MCP clients

- `packages/dashboard/lib/mcp-server-client.ts`
  - Builds MCP `Client` + `StreamableHTTPClientTransport`.
  - Connects to `${MCP_SERVER_URL}/mcp`.
  - Calls `client.callTool(...)`, then closes client.
- `packages/dashboard/lib/mcp-client.ts`
  - Browser typed wrapper around `/api/mcp`.
  - Exposes:
    - `readContext(input={})`
    - `raisePr(input)`
    - `listPrs()`
    - `mergePr(input)`
    - `closePr(input)`
    - `getHistory()`
    - `rollbackTo(sha)` (read snapshot then raise rollback PR)
  - Error handling: throws when `/api/mcp` non-2xx.

### 4.3 UI components and behaviors

- `Nav`: top-level links for `/`, `/prs`, `/history`.
- `ContextView`: plain text rendering in preformatted block.
- `DiffView`: side-by-side diff using `react-diff-viewer-continued`.
- `ActionButtons`:
  - `kind: "pr"`: Merge/Close buttons call MCP tool wrappers and reload page.
  - `kind: "rollback"`: Rollback button calls `rollbackTo(sha)` and navigates to `/prs`.
  - Uses local `busy` state to disable actions during requests.

### 4.4 Page data flows

- `/` (`app/page.tsx`)
  - Client page fetches `readContext()` on mount and renders current context.
- `/prs` (`app/prs/page.tsx`)
  - Client page fetches `listPrs()` on mount.
  - Renders metadata + diff + merge/close actions per PR.
- `/history` (`app/history/page.tsx`)
  - Client page fetches `getHistory()` on mount.
  - Includes link to snapshot route and rollback action.
- `/history/[sha]` (`app/history/[sha]/page.tsx`)
  - Client page reads snapshot using `readContext({ sha })`.

## 5) Shared type contracts (`packages/shared/src/index.ts`)

- Core entities:
  - `ContextFile`, `RaisePrInput`, `RaisePrResult`, `OpenPr`, `HistoryEntry`
- Tool typing:
  - `ToolName` union (six tool names)
  - `ToolInputMap` and `ToolOutputMap`
  - Generic helpers `ToolInput<T>`, `ToolOutput<T>`
- Purpose:
  - Keep dashboard client and MCP tool surface aligned by compile-time contracts.

## 6) Test coverage details

- `packages/mcp-server/tests/github.test.ts`
  - Verifies:
    - base64 decode in `getContext`
    - `listPrs` filters `kontex/` branches
    - `mergePr` uses squash merge
    - `closePr` issues close state update
    - `getHistory` filter/sort behavior
  - Mock boundary: manual mocked Octokit client object.
- `packages/mcp-server/tests/tools.test.ts`
  - Verifies each tool delegates and maps IO correctly.
  - Mock boundary: `vi.mock("../src/github.js")`.
- `packages/dashboard/tests/mcp-client.test.ts`
  - Verifies wrapper POST behavior and rollback two-call sequence.
  - Mock boundary: `globalThis.fetch`.
- `packages/dashboard/tests/pages.test.tsx`
  - Verifies route headings render for three primary pages.
  - Mock boundary: `vi.mock("../lib/mcp-client")`.

Known test gap in current MVP: page tests are smoke-level and do not yet assert merge/close/rollback button click side effects end-to-end.

## 7) Environment and deployment details

- Environment documentation rule:
  - Document env keys from package runtime contracts (for example, `env.ts`), not only from whichever keys are currently present in `.env`.
  - Use package-local `.env` as the local value source for those documented keys.
- MCP server env (contract in `packages/mcp-server/src/env.ts`, local values in `packages/mcp-server/.env`):
  - `GITHUB_PAT`, `REPO_OWNER`, `REPO_NAME`, optional/defaulted `CONTEXT_PATH`, optional `PORT`.
- Dashboard env:
  - `MCP_SERVER_URL` only.
- Governance dependency:
  - Branch protection on `main` enforces PR merge process.
- CI:
  - `.github/workflows/ci.yml` runs install, typecheck, test, build.

## 8) Explicitly out of scope

- No schema/structure enforcement for context file content.
- No multi-space tenancy.
- No notification or automation triggers.
- No drift/conflict intelligence layer.
- No role model beyond GitHub branch protection authority.

## 9) Accepted weaknesses and implementation caveats

- Public dashboard URL is acceptable for first-user dogfooding but not for general release.
- Stateless transport limits long-lived session behavior.
- Current MCP registration uses a local `any` cast in `server.ts`; this is intentional for now to keep strict compilation passing while integrating SDK generics.
- Dashboard pages are currently client-fetched (not server data fetching), which is simpler but not optimized for SEO or first paint.

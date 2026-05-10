import Link from "next/link";
import { auth } from "../lib/auth";
import { redirect } from "next/navigation";
import { Logo } from "../components/Logo";
import { Icon } from "../components/Icon";

const SAMPLE_CONFIG = `{
  "mcpServers": {
    "kontex": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://kontex-mcp.example.com/mcp",
        "--header",
        "Authorization:Bearer kx_live_..."
      ]
    }
  }
}`;

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) {
    return redirect("/overview");
  }
  const ctaHref = "/signin";
  const ctaLabel = "Sign in with Google";

  return (
    <div className="min-h-screen flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant h-14 flex items-center px-gutter justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Logo size="sm" withWordmark />
          <span className="px-2 py-0.5 rounded-full bg-surface-container-high border border-outline-variant font-label-sm text-label-sm text-on-surface-variant hidden md:inline-block">
            Beta
          </span>
        </Link>
        <nav className="hidden md:flex gap-6 items-center">
          <a className="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors" href="#how">
            How it works
          </a>
          <Link className="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors" href="/docs">
            Setup guide
          </Link>
          <a className="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors" href="#access">
            Access control
          </a>
        </nav>
        <Link
          href={ctaHref}
          className="bg-on-surface text-surface px-4 py-2 rounded-DEFAULT font-label-md text-label-md hover:bg-on-surface-variant transition-colors border border-outline-variant"
        >
          {ctaLabel}
        </Link>
      </header>

      <main className="flex-grow pt-14 flex flex-col items-center w-full dot-grid">
        <section className="w-full max-w-container-max px-gutter py-24 md:py-32 flex flex-col items-center text-center hero-gradient border-b border-outline-variant relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-high border border-outline-variant mb-8">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="font-mono text-mono-sm text-primary">v2 — Postgres + pgvector</span>
          </div>
          <h1 className="text-headline-2xl font-bold text-on-surface max-w-4xl mb-6 tracking-tight">
            Institutional memory <br />
            <span className="text-on-surface-variant">for AI-native teams</span>
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mb-12">
            One ledger of vector-searchable knowledge per project. Every change goes through a human approval gate.
            Reachable from Claude Desktop through MCP.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <Link
              href={ctaHref}
              className="bg-on-surface text-surface px-6 py-3 rounded-DEFAULT font-label-md text-label-md hover:bg-on-surface-variant transition-colors border border-outline-variant flex items-center gap-2"
            >
              {ctaLabel}
              <Icon name="arrow_forward" className="text-[16px]" />
            </Link>
            <Link
              href="/docs"
              className="bg-surface text-on-surface px-6 py-3 rounded-DEFAULT font-label-md text-label-md hover:bg-surface-container-high transition-colors border border-outline-variant flex items-center gap-2"
            >
              <Icon name="menu_book" className="text-[16px]" /> Read setup docs
            </Link>
          </div>

          <div className="mt-20 w-full max-w-3xl bg-[#0e0e10] rounded-xl border border-outline-variant overflow-hidden shadow-2xl flex flex-col text-left">
            <div className="h-10 border-b border-outline-variant bg-surface-container-low flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-surface-container-highest" />
              <div className="w-3 h-3 rounded-full bg-surface-container-highest" />
              <div className="w-3 h-3 rounded-full bg-surface-container-highest" />
              <div className="ml-4 font-mono text-mono-sm text-on-surface-variant">claude_desktop_config.json</div>
            </div>
            <pre className="p-6 font-mono text-mono-sm text-on-surface-variant overflow-auto leading-relaxed whitespace-pre">
              {SAMPLE_CONFIG}
            </pre>
          </div>
        </section>

        <section
          id="how"
          className="scroll-mt-14 w-full max-w-container-max px-gutter py-24 border-b border-outline-variant flex flex-col items-center"
        >
          <div className="text-center mb-16">
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-4">Three pieces, one mechanic</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto">
              The MCP server is the only thing that touches the database. The dashboard is just another MCP client,
              same as your LLM.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            <FeatureCard
              icon="folder_managed"
              title="Projects & Spaces"
              body="Each project owns one or more spaces. Per-space editor and reader roles control who can propose, approve, or only query."
            />
            <FeatureCard
              icon="approval_delegation"
              title="Pending changes"
              body="Every new entry, edit, and archive goes through a human approval queue. Nothing lands in the live ledger until a space editor signs off."
            />
            <FeatureCard
              icon="manage_search"
              title="Vector-search context"
              body="Semantic search over OpenAI embeddings, scoped to the spaces you have access to inside one project at a time. Same surface for the LLM and the dashboard."
            />
          </div>
        </section>

        <section
          id="mcp"
          className="scroll-mt-14 w-full max-w-container-max px-gutter py-24 border-b border-outline-variant"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-stack-lg items-start">
            <div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface mb-stack-sm">Use it from any LLM</h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant">
                Claude&apos;s native Custom Connectors UI does not yet support static bearer tokens, so Claude Desktop
                talks to Kontex through the
                <code className="font-mono mx-1 px-1 bg-surface-container-low rounded border border-outline-variant">
                  mcp-remote
                </code>
                stdio bridge. Generate a key on the dashboard, paste this snippet into
                <code className="font-mono mx-1 px-1 bg-surface-container-low rounded border border-outline-variant">
                  ~/Library/Application Support/Claude/claude_desktop_config.json
                </code>
                and restart Claude Desktop. Full setup steps for macOS, Windows, and Linux are in the
                <Link href="/docs" className="text-primary hover:underline ml-1">
                  documentation guide
                </Link>
                .
              </p>
              <ul className="font-body-md text-body-md text-on-surface-variant mt-stack-md flex flex-col gap-stack-xs">
                <li className="flex items-start gap-2">
                  <Icon name="check_circle" className="text-primary mt-0.5" filled /> 8 MCP tools — query, propose,
                  resolve. Nothing else.
                </li>
                <li className="flex items-start gap-2">
                  <Icon name="check_circle" className="text-primary mt-0.5" filled /> 1500-character hard cap per
                  entry. Forces one concept per entry.
                </li>
                <li className="flex items-start gap-2">
                  <Icon name="check_circle" className="text-primary mt-0.5" filled /> Revoke a key in the dashboard,
                  the next tool call fails.
                </li>
              </ul>
            </div>
            <div className="bg-[#0e0e10] rounded-xl border border-outline-variant overflow-hidden">
              <div className="h-10 border-b border-outline-variant bg-surface-container-low flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-surface-container-highest" />
                <div className="w-3 h-3 rounded-full bg-surface-container-highest" />
                <div className="w-3 h-3 rounded-full bg-surface-container-highest" />
                <div className="ml-4 font-mono text-mono-sm text-on-surface-variant">
                  claude_desktop_config.json
                </div>
              </div>
              <pre className="p-6 font-mono text-mono-sm text-on-surface-variant overflow-auto leading-relaxed whitespace-pre">
                {SAMPLE_CONFIG}
              </pre>
            </div>
          </div>
        </section>

        <section
          id="access"
          className="scroll-mt-14 w-full max-w-container-max px-gutter py-24 border-b border-outline-variant"
        >
          <div className="text-center mb-16">
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-4">Access control, not access by convention</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto">
              Two layers, both must pass. Project membership lets you in. Space-level role decides what you can do
              inside each space. Changing a role takes effect on the next tool call — no key rotation needed.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <FeatureCard
              icon="admin_panel_settings"
              title="Project-level"
              body="admin can invite, create spaces, assign roles. member is in the project, nothing more. Admins do not get auto-access inside spaces."
            />
            <FeatureCard
              icon="workspaces"
              title="Space-level"
              body="editor can propose changes and resolve pending ones. reader can only query and read. No row at all means no access to that space whatsoever."
            />
          </div>
        </section>
      </main>

      <footer className="w-full bg-surface-container-lowest border-t border-outline-variant py-12 px-gutter flex flex-col md:flex-row justify-between items-start md:items-center gap-stack-md">
        <div>
          <Logo size="sm" withWordmark withTagline />
        </div>
        <div className="flex gap-8">
          <div className="flex flex-col gap-2">
            <span className="font-label-md text-label-md text-on-surface mb-1">Product</span>
            <Link href="/projects" className="font-body-md text-body-md text-on-surface-variant hover:text-on-surface">
              Projects
            </Link>
            <Link href="/browse" className="font-body-md text-body-md text-on-surface-variant hover:text-on-surface">
              Context browser
            </Link>
            <Link href="/keys" className="font-body-md text-body-md text-on-surface-variant hover:text-on-surface">
              API keys
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-label-md text-label-md text-on-surface mb-1">Resources</span>
            <a
              className="font-body-md text-body-md text-on-surface-variant hover:text-on-surface"
              href="https://github.com/geelen/mcp-remote"
              target="_blank"
              rel="noreferrer"
            >
              mcp-remote
            </a>
            <a
              className="font-body-md text-body-md text-on-surface-variant hover:text-on-surface"
              href="https://modelcontextprotocol.io"
              target="_blank"
              rel="noreferrer"
            >
              MCP spec
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="bg-surface border border-outline-variant rounded-lg p-6 hover:bg-surface-container-low transition-colors group flex flex-col">
      <div className="w-12 h-12 rounded-DEFAULT bg-surface-container-high border border-outline-variant flex items-center justify-center mb-6 text-primary group-hover:scale-105 transition-transform">
        <Icon name={icon} />
      </div>
      <h3 className="font-headline-md text-headline-md text-on-surface mb-2">{title}</h3>
      <p className="font-body-md text-body-md text-on-surface-variant flex-grow">{body}</p>
    </div>
  );
}

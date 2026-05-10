import Link from "next/link";
import { Icon } from "../../components/Icon";

const SAMPLE_CONFIG = `{
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
}`;

export default function DocsPage() {
  return (
    <main className="min-h-screen dot-grid">
      <div className="max-w-container-max mx-auto px-gutter py-12 flex flex-col gap-10">
        <header>
          <p className="font-mono text-mono-sm text-on-surface-variant">Kontex docs</p>
          <h1 className="font-headline-xl text-headline-xl text-on-surface">Set up Kontex with Claude Desktop</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2">
            Follow this guide step by step. You do not need any extra tools besides Claude Desktop and your Kontex API
            key.
          </p>
          <div className="mt-4 flex gap-4">
            <a href="#what" className="text-primary hover:underline">
              What it is
            </a>
            <a href="#setup" className="text-primary hover:underline">
              Setup
            </a>
            <a href="#keys" className="text-primary hover:underline">
              API keys
            </a>
          </div>
        </header>

        <section id="what" className="scroll-mt-14">
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-3">What Kontex does</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card
              title="Projects and spaces"
              body="A project can have many spaces. Each space has its own reader/editor permissions."
              icon="folder_managed"
            />
            <Card
              title="Human approval gate"
              body="Changes are proposed first. Editors approve them before they become part of team memory."
              icon="approval_delegation"
            />
            <Card
              title="Searchable context"
              body="Your LLM can query approved entries using MCP tools and semantic search."
              icon="manage_search"
            />
          </div>
        </section>

        <section id="setup" className="scroll-mt-14">
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-3">Setup by operating system</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mb-4">
            1) Generate a key in Kontex. 2) Open your Claude config file. 3) Paste this JSON and replace the host and
            key.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <PathCard os="macOS" path="~/Library/Application Support/Claude/claude_desktop_config.json" />
            <PathCard os="Windows" path="%APPDATA%\\Claude\\claude_desktop_config.json" />
            <PathCard os="Linux" path="~/.config/Claude/claude_desktop_config.json" />
          </div>
          <div className="bg-[#0e0e10] border border-outline-variant rounded-DEFAULT p-4 font-mono text-mono-sm text-on-surface-variant overflow-auto">
            <pre>{SAMPLE_CONFIG}</pre>
          </div>
        </section>

        <section id="keys" className="scroll-mt-14">
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-3">API keys</h2>
          <ol className="list-decimal ml-5 font-body-md text-body-md text-on-surface-variant space-y-1">
            <li>Sign in and open the API Keys page.</li>
            <li>Create a new key and copy it immediately.</li>
            <li>Paste it in your Claude config JSON under Authorization header.</li>
            <li>Restart Claude Desktop and confirm Kontex tools appear.</li>
          </ol>
          <Link href="/keys" className="inline-flex mt-4 items-center gap-2 text-primary hover:underline">
            <Icon name="key" className="text-[16px]" />
            Open API Keys
          </Link>
        </section>
      </div>
    </main>
  );
}

function Card({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="bg-surface border border-outline-variant rounded-DEFAULT p-4">
      <div className="w-10 h-10 rounded-DEFAULT bg-surface-container-high border border-outline-variant flex items-center justify-center mb-3 text-primary">
        <Icon name={icon} />
      </div>
      <h3 className="font-headline-md text-headline-md text-on-surface mb-1">{title}</h3>
      <p className="font-body-md text-body-md text-on-surface-variant">{body}</p>
    </div>
  );
}

function PathCard({ os, path }: { os: string; path: string }) {
  return (
    <div className="bg-surface border border-outline-variant rounded-DEFAULT p-4">
      <p className="font-label-md text-label-md text-on-surface">{os}</p>
      <code className="font-mono text-mono-sm text-on-surface-variant break-all">{path}</code>
    </div>
  );
}

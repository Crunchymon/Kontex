"use client";
import Link from "next/link";
import { useState } from "react";
import { generateApiKey } from "../../../lib/actions";
import { Icon } from "../../../components/Icon";

type Props = {
  baseUrl: string;
};

export function ApiKeyForm({ baseUrl }: Props) {
  const [name, setName] = useState("");
  const [generated, setGenerated] = useState<{ id: string; rawKey: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const onSubmit = async (formData: FormData) => {
    setError(null);
    try {
      const result = await generateApiKey(formData);
      setGenerated({ ...result, name: String(formData.get("name") ?? "Untitled key") });
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate key");
    }
  };

  const claudeSnippet = generated
    ? `{
  "mcpServers": {
    "kontex": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "${baseUrl.replace(/\/$/, "")}/mcp",
        "--header",
        "Authorization:Bearer ${generated.rawKey}"
      ]
    }
  }
}`
    : "";

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section className="bg-surface border border-outline-variant rounded-DEFAULT p-stack-md flex flex-col gap-stack-sm">
      <h2 className="font-headline-md text-headline-md text-on-surface">Generate a new API key</h2>
      <form action={onSubmit} className="flex flex-col md:flex-row gap-stack-sm">
        <input
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. My Claude setup"
          className="flex-1 bg-surface-container-lowest border border-outline-variant text-on-surface font-body-md text-body-md rounded-DEFAULT px-3 py-2 focus:outline-none focus:border-primary"
        />
        <button
          type="submit"
          className="bg-on-surface text-surface px-4 py-2 rounded-DEFAULT font-label-md text-label-md hover:bg-on-surface-variant transition-colors flex items-center gap-2"
        >
          <Icon name="vpn_key" className="text-[16px]" /> Generate key
        </button>
      </form>

      {error ? (
        <div className="font-body-md text-body-md text-error border border-error/40 bg-error-container/10 rounded-DEFAULT px-3 py-2">
          {error}
        </div>
      ) : null}

      {generated ? (
        <div className="flex flex-col gap-stack-sm border border-primary/40 bg-primary-container/10 rounded-DEFAULT p-stack-md">
          <div className="flex items-center gap-2 text-primary font-label-md text-label-md">
            <Icon name="warning" className="text-[16px]" filled />
            Copy this key now. It will not be shown again.
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-DEFAULT p-3 font-mono text-mono-sm text-on-surface flex justify-between items-center gap-3">
            <code className="break-all">{generated.rawKey}</code>
            <button
              onClick={() => copy(generated.rawKey)}
              className="font-label-sm text-label-sm border border-outline-variant px-2 py-1 rounded-DEFAULT text-on-surface hover:bg-surface-variant transition-colors flex items-center gap-1"
            >
              <Icon name="content_copy" className="text-[12px]" /> Copy
            </button>
          </div>

          <div className="mt-stack-sm">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-stack-sm flex items-center gap-2">
              <Icon name="terminal" className="text-on-surface-variant" /> Claude Desktop config
            </h3>
            <p className="font-body-md text-body-md text-on-surface-variant mb-stack-sm">
              Claude&apos;s native &quot;Custom Connectors&quot; UI does not yet accept static bearer tokens. Use the
              <code className="font-mono text-mono-sm mx-1 px-1 rounded bg-surface-container-lowest border border-outline-variant">
                mcp-remote
              </code>
              bridge — paste this block into
              <code className="font-mono text-mono-sm mx-1 px-1 rounded bg-surface-container-lowest border border-outline-variant">
                ~/Library/Application Support/Claude/claude_desktop_config.json
              </code>
              and restart Claude Desktop.
            </p>
            <div className="bg-[#0e0e10] border border-outline-variant rounded-DEFAULT p-3 font-mono text-mono-sm text-on-surface-variant relative">
              <button
                onClick={() => copy(claudeSnippet)}
                className="absolute top-2 right-2 font-label-sm text-label-sm border border-outline-variant px-2 py-1 rounded-DEFAULT text-on-surface hover:bg-surface-variant transition-colors flex items-center gap-1 bg-surface-dim"
              >
                <Icon name="content_copy" className="text-[12px]" /> {copied ? "Copied" : "Copy"}
              </button>
              <pre className="overflow-auto whitespace-pre">{claudeSnippet}</pre>
            </div>
            <Link href="/docs" className="inline-block font-label-sm text-label-sm text-primary hover:underline mt-stack-sm">
              Full setup guide for macOS, Windows, and Linux
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}

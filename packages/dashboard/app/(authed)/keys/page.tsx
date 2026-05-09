import { redirect } from "next/navigation";
import { auth } from "../../../lib/auth";
import { listUserApiKeys } from "../../../lib/access";
import { revokeApiKeyAction } from "../../../lib/actions";
import { Icon } from "../../../components/Icon";
import { ApiKeyForm } from "./ApiKeyForm";

export default async function KeysPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const keys = await listUserApiKeys(session.user.id);
  const baseUrl = process.env.MCP_PUBLIC_URL ?? process.env.MCP_SERVER_URL ?? "https://kontex-mcp.example.com";

  return (
    <div className="flex flex-col gap-stack-lg">
      <header className="border-b border-outline-variant pb-stack-sm">
        <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">API Keys</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          Generate a key for each LLM client (Claude Desktop, ChatGPT, Cursor). Keys are shown once and stored as a
          hash. Revoke any key here to immediately cut off access.
        </p>
      </header>

      <ApiKeyForm baseUrl={baseUrl} />

      <section className="bg-surface border border-outline-variant rounded-DEFAULT">
        <header className="px-stack-md py-stack-sm border-b border-outline-variant bg-surface-container-lowest rounded-t-DEFAULT flex items-center justify-between">
          <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
            <Icon name="key" className="text-on-surface-variant" /> Active and revoked keys
          </h2>
          <span className="font-mono text-mono-sm text-on-surface-variant">{keys.length}</span>
        </header>
        {keys.length === 0 ? (
          <p className="px-stack-md py-stack-md font-body-md text-body-md text-on-surface-variant">
            No keys yet.
          </p>
        ) : (
          <ul className="divide-y divide-outline-variant">
            {keys.map((k) => (
              <li key={k.id} className="px-stack-md py-stack-sm flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-label-md text-label-md text-on-surface flex items-center gap-2">
                    <span>{k.name}</span>
                    <span
                      className={`font-label-sm text-label-sm px-2 py-0.5 rounded-DEFAULT border ${
                        k.revokedAt
                          ? "bg-error-container/20 border-error/40 text-error"
                          : "bg-primary-container/20 border-primary/40 text-primary"
                      }`}
                    >
                      {k.revokedAt ? "revoked" : "active"}
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">{k.source}</span>
                  </div>
                  <div className="font-mono text-mono-sm text-on-surface-variant mt-1">
                    created {k.createdAt.toLocaleString()}
                    {k.lastUsedAt ? ` · last used ${k.lastUsedAt.toLocaleString()}` : " · never used"}
                    {k.revokedAt ? ` · revoked ${k.revokedAt.toLocaleString()}` : ""}
                  </div>
                </div>
                {!k.revokedAt ? (
                  <form action={revokeApiKeyAction}>
                    <input type="hidden" name="id" value={k.id} />
                    <button className="font-label-sm text-label-sm border border-error/50 text-error px-2 py-1 rounded-DEFAULT hover:bg-error/10 transition-colors">
                      Revoke
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

import Link from "next/link";
import { auth } from "../../lib/auth";
import { redirect } from "next/navigation";
import { dashboardStats, listProjectsForUser, recentEntriesForUser } from "../../lib/access";
import { Icon } from "../../components/Icon";

export default async function OverviewPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const userId = session.user.id;
  const [stats, projects, recent] = await Promise.all([
    dashboardStats(userId),
    listProjectsForUser(userId),
    recentEntriesForUser(userId)
  ]);

  return (
    <div className="flex flex-col gap-stack-lg">
      <header className="flex justify-between items-end border-b border-outline-variant pb-stack-sm">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">Overview</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Your projects, spaces, and the queue of pending changes you can resolve.
          </p>
        </div>
        <span className="flex items-center gap-2 px-3 py-1.5 bg-surface-container border border-outline-variant rounded-DEFAULT">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="font-mono text-mono-sm text-on-surface">SYS_OP_NORMAL</span>
        </span>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-stack-md">
        <Metric label="Projects you belong to" value={String(stats.projects)} icon="folder_managed" />
        <Metric label="Spaces in those projects" value={String(stats.spaces)} icon="workspaces" />
        <Metric label="Distinct members" value={String(stats.members)} icon="group" />
        <Metric label="Pending changes" value={String(stats.pending)} icon="approval_delegation" tone="primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-stack-md">
        <section className="lg:col-span-2 bg-surface border border-outline-variant rounded-DEFAULT flex flex-col">
          <header className="p-stack-md border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest rounded-t-DEFAULT">
            <div className="flex items-center gap-2">
              <Icon name="folder_managed" className="text-on-surface-variant" />
              <h2 className="font-headline-md text-headline-md text-on-surface">Projects</h2>
            </div>
            <Link
              href="/projects"
              className="font-label-sm text-label-sm border border-outline-variant px-3 py-1 rounded-DEFAULT text-on-surface hover:bg-surface-variant transition-colors"
            >
              Manage
            </Link>
          </header>
          {projects.length === 0 ? (
            <EmptyHint
              title="No projects yet"
              hint="Create your first project on the Projects page. A project owns spaces, and each space owns its own approved entries."
              cta={{ href: "/projects", label: "Create project" }}
            />
          ) : (
            <ul className="divide-y divide-outline-variant">
              {projects.map((p) => (
                <li key={p.id} className="px-stack-md py-stack-sm flex items-center justify-between hover:bg-surface-container-low transition-colors">
                  <Link href={`/projects/${p.id}`} className="flex items-center gap-3 min-w-0">
                    <Icon name="folder_managed" className="text-on-surface-variant" />
                    <div className="min-w-0">
                      <div className="font-label-md text-label-md text-on-surface truncate">{p.name}</div>
                      <div className="font-mono text-mono-sm text-on-surface-variant truncate">
                        {p.spaceCount} space{p.spaceCount === 1 ? "" : "s"} · {p.projectRole}
                      </div>
                    </div>
                  </Link>
                  <Link
                    href={`/projects/${p.id}`}
                    className="text-on-surface-variant hover:text-on-surface transition-colors"
                  >
                    <Icon name="chevron_right" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-surface border border-outline-variant rounded-DEFAULT flex flex-col">
          <header className="p-stack-md border-b border-outline-variant bg-surface-container-lowest rounded-t-DEFAULT flex items-center gap-2">
            <Icon name="schedule" className="text-on-surface-variant" />
            <h2 className="font-headline-md text-headline-md text-on-surface">Recent entries</h2>
          </header>
          {recent.length === 0 ? (
            <EmptyHint
              title="No approved entries yet"
              hint="When your team logs knowledge through their LLM and you approve it on the Pending page, those entries will land here."
            />
          ) : (
            <ul className="divide-y divide-outline-variant">
              {recent.map((r) => (
                <li key={r.id} className="px-stack-md py-stack-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-label-md text-label-md text-on-surface line-clamp-1">
                      {r.title ?? "(untitled)"}
                    </span>
                    <span className="font-mono text-mono-sm text-on-surface-variant">
                      {r.createdAt.toLocaleDateString()}
                    </span>
                  </div>
                  <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2 mt-1">
                    {r.content}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
  tone = "default"
}: {
  label: string;
  value: string;
  icon: string;
  tone?: "default" | "primary";
}) {
  return (
    <div className="bg-surface border border-outline-variant rounded-DEFAULT p-stack-md flex flex-col relative overflow-hidden group">
      <div className="absolute right-0 top-0 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
        <Icon name={icon} className="text-[80px] -mt-4 -mr-4" />
      </div>
      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-stack-sm">
        {label}
      </span>
      <span
        className={`font-headline-xl text-headline-xl mt-auto ${tone === "primary" ? "text-primary" : "text-on-surface"}`}
      >
        {value}
      </span>
    </div>
  );
}

function EmptyHint({
  title,
  hint,
  cta
}: {
  title: string;
  hint: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="px-stack-md py-stack-lg flex flex-col gap-stack-sm">
      <span className="font-label-md text-label-md text-on-surface">{title}</span>
      <span className="font-body-md text-body-md text-on-surface-variant">{hint}</span>
      {cta ? (
        <Link
          href={cta.href}
          className="font-label-md text-label-md text-primary hover:underline mt-stack-xs"
        >
          {cta.label} →
        </Link>
      ) : null}
    </div>
  );
}

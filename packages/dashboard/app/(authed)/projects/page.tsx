import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "../../../lib/auth";
import { listProjectsForUser } from "../../../lib/access";
import { createProject } from "../../../lib/actions";
import { Icon } from "../../../components/Icon";

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");
  const projects = await listProjectsForUser(session.user.id);

  return (
    <div className="flex flex-col gap-stack-lg">
      <header className="flex justify-between items-end border-b border-outline-variant pb-stack-sm">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">Projects</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Each project owns spaces. Spaces own approved entries and per-user roles.
          </p>
        </div>
      </header>

      <section className="bg-surface border border-outline-variant rounded-DEFAULT p-stack-md">
        <h2 className="font-headline-md text-headline-md text-on-surface mb-stack-sm">Create a project</h2>
        <form action={createProject} className="flex flex-col md:flex-row gap-stack-sm">
          <input
            name="name"
            required
            placeholder="e.g. CS301"
            className="flex-1 bg-surface-container-lowest border border-outline-variant text-on-surface font-body-md text-body-md rounded-DEFAULT px-3 py-2 focus:outline-none focus:border-primary"
          />
          <button
            type="submit"
            className="bg-on-surface text-surface px-4 py-2 rounded-DEFAULT font-label-md text-label-md hover:bg-on-surface-variant transition-colors flex items-center gap-2"
          >
            <Icon name="add" className="text-[16px]" /> Create project
          </button>
        </form>
        <p className="font-label-sm text-label-sm text-on-surface-variant mt-stack-sm">
          You become the project admin. Add spaces and members from the project detail page.
        </p>
      </section>

      <section className="bg-surface border border-outline-variant rounded-DEFAULT">
        <header className="px-stack-md py-stack-sm border-b border-outline-variant bg-surface-container-lowest rounded-t-DEFAULT flex items-center justify-between">
          <h2 className="font-headline-md text-headline-md text-on-surface">Your projects</h2>
          <span className="font-mono text-mono-sm text-on-surface-variant">{projects.length}</span>
        </header>
        {projects.length === 0 ? (
          <div className="px-stack-md py-stack-lg text-on-surface-variant font-body-md text-body-md">
            No projects yet. Create one above to get started.
          </div>
        ) : (
          <ul className="divide-y divide-outline-variant">
            {projects.map((p) => (
              <li key={p.id} className="hover:bg-surface-container-low transition-colors">
                <Link
                  href={`/projects/${p.id}`}
                  className="flex items-center justify-between px-stack-md py-stack-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon name="folder_managed" className="text-on-surface-variant" />
                    <div className="min-w-0">
                      <div className="font-label-md text-label-md text-on-surface truncate">{p.name}</div>
                      <div className="font-mono text-mono-sm text-on-surface-variant">
                        {p.spaceCount} space{p.spaceCount === 1 ? "" : "s"} · role: {p.projectRole}
                      </div>
                    </div>
                  </div>
                  <Icon name="chevron_right" className="text-on-surface-variant" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "../../../../lib/auth";
import {
  getProjectForUser,
  listMembersForProject,
  listSpacesForProject
} from "../../../../lib/access";
import {
  createSpace,
  inviteMember,
  setProjectRole
} from "../../../../lib/actions";
import { Icon } from "../../../../components/Icon";

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const proj = await getProjectForUser(session.user.id, params.id);
  if (!proj) notFound();

  const [spaces, members] = await Promise.all([
    listSpacesForProject(params.id),
    listMembersForProject(params.id)
  ]);

  const isAdmin = proj.projectRole === "admin";

  return (
    <div className="flex flex-col gap-stack-lg">
      <header className="flex justify-between items-end border-b border-outline-variant pb-stack-sm">
        <div>
          <p className="font-mono text-mono-sm text-on-surface-variant">PROJECT · {params.id.slice(0, 8)}</p>
          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">{proj.project.name}</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Your role on this project: <span className="text-primary">{proj.projectRole}</span>
          </p>
        </div>
        <div className="flex gap-stack-sm">
          <Link
            href={`/projects/${params.id}/permissions`}
            className="font-label-md text-label-md border border-outline-variant px-3 py-1.5 rounded-DEFAULT text-on-surface hover:bg-surface-variant transition-colors"
          >
            Permissions matrix
          </Link>
          <Link
            href={`/browse?project=${params.id}`}
            className="font-label-md text-label-md bg-on-surface text-surface px-3 py-1.5 rounded-DEFAULT hover:bg-on-surface-variant transition-colors"
          >
            Browse context
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-stack-md">
        <section className="bg-surface border border-outline-variant rounded-DEFAULT">
          <header className="px-stack-md py-stack-sm border-b border-outline-variant bg-surface-container-lowest rounded-t-DEFAULT flex items-center justify-between">
            <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
              <Icon name="workspaces" className="text-on-surface-variant" /> Spaces
            </h2>
            <span className="font-mono text-mono-sm text-on-surface-variant">{spaces.length}</span>
          </header>
          {isAdmin ? (
            <form action={createSpace} className="flex gap-stack-sm p-stack-md border-b border-outline-variant">
              <input type="hidden" name="project_id" value={params.id} />
              <input
                name="name"
                required
                placeholder="e.g. Maths"
                className="flex-1 bg-surface-container-lowest border border-outline-variant text-on-surface font-body-md text-body-md rounded-DEFAULT px-3 py-2 focus:outline-none focus:border-primary"
              />
              <button className="bg-on-surface text-surface px-3 py-2 rounded-DEFAULT font-label-md text-label-md hover:bg-on-surface-variant transition-colors flex items-center gap-2">
                <Icon name="add" className="text-[14px]" /> Add space
              </button>
            </form>
          ) : null}
          {spaces.length === 0 ? (
            <p className="px-stack-md py-stack-md font-body-md text-body-md text-on-surface-variant">
              No spaces yet.
            </p>
          ) : (
            <ul className="divide-y divide-outline-variant">
              {spaces.map((s) => (
                <li key={s.id} className="px-stack-md py-stack-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon name="workspaces" className="text-on-surface-variant" />
                    <div>
                      <div className="font-label-md text-label-md text-on-surface">{s.name}</div>
                      <div className="font-mono text-mono-sm text-on-surface-variant">{s.id.slice(0, 8)}</div>
                    </div>
                  </div>
                  <Link
                    href={`/projects/${params.id}/permissions`}
                    className="font-label-sm text-label-sm text-primary hover:underline"
                  >
                    Manage members
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-surface border border-outline-variant rounded-DEFAULT">
          <header className="px-stack-md py-stack-sm border-b border-outline-variant bg-surface-container-lowest rounded-t-DEFAULT flex items-center justify-between">
            <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
              <Icon name="group" className="text-on-surface-variant" /> Members
            </h2>
            <span className="font-mono text-mono-sm text-on-surface-variant">{members.length}</span>
          </header>
          {isAdmin ? (
            <form action={inviteMember} className="flex flex-wrap gap-stack-sm p-stack-md border-b border-outline-variant">
              <input type="hidden" name="project_id" value={params.id} />
              <input
                name="email"
                type="email"
                required
                placeholder="teammate@school.edu"
                className="flex-1 min-w-[200px] bg-surface-container-lowest border border-outline-variant text-on-surface font-body-md text-body-md rounded-DEFAULT px-3 py-2 focus:outline-none focus:border-primary"
              />
              <select
                name="role"
                defaultValue="member"
                className="bg-surface-container-lowest border border-outline-variant text-on-surface font-body-md text-body-md rounded-DEFAULT px-3 py-2 focus:outline-none focus:border-primary"
              >
                <option value="member">member</option>
                <option value="admin">admin</option>
              </select>
              <button className="bg-on-surface text-surface px-3 py-2 rounded-DEFAULT font-label-md text-label-md hover:bg-on-surface-variant transition-colors flex items-center gap-2">
                <Icon name="person_add" className="text-[14px]" /> Invite
              </button>
            </form>
          ) : null}
          {members.length === 0 ? (
            <p className="px-stack-md py-stack-md font-body-md text-body-md text-on-surface-variant">
              No members yet.
            </p>
          ) : (
            <ul className="divide-y divide-outline-variant">
              {members.map((m) => (
                <li key={m.userId} className="px-stack-md py-stack-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center font-label-md text-label-md">
                      {m.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-label-md text-label-md text-on-surface">{m.name}</div>
                      <div className="font-mono text-mono-sm text-on-surface-variant">{m.email}</div>
                    </div>
                  </div>
                  {isAdmin ? (
                    <form action={setProjectRole} className="flex items-center gap-2">
                      <input type="hidden" name="project_id" value={params.id} />
                      <input type="hidden" name="user_id" value={m.userId} />
                      <select
                        name="role"
                        defaultValue={m.projectRole}
                        className="bg-surface-container-lowest border border-outline-variant text-on-surface font-label-md text-label-md rounded-DEFAULT px-2 py-1 focus:outline-none focus:border-primary"
                      >
                        <option value="member">member</option>
                        <option value="admin">admin</option>
                        <option value="remove">remove</option>
                      </select>
                      <button className="font-label-sm text-label-sm border border-outline-variant px-2 py-1 rounded-DEFAULT text-on-surface hover:bg-surface-variant transition-colors">
                        Save
                      </button>
                    </form>
                  ) : (
                    <span className="font-label-sm text-label-sm text-on-surface-variant">{m.projectRole}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

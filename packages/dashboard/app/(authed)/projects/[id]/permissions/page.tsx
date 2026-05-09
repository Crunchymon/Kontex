import { notFound, redirect } from "next/navigation";
import { auth } from "../../../../../lib/auth";
import {
  getProjectForUser,
  listMembersForProject,
  listSpacesForProject
} from "../../../../../lib/access";
import { setSpaceRole } from "../../../../../lib/actions";
import { Icon } from "../../../../../components/Icon";

export default async function PermissionsPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const proj = await getProjectForUser(session.user.id, params.id);
  if (!proj) notFound();

  const [spaces, members] = await Promise.all([
    listSpacesForProject(params.id),
    listMembersForProject(params.id)
  ]);

  const canEdit = proj.projectRole === "admin";

  return (
    <div className="flex flex-col gap-stack-lg">
      <header className="border-b border-outline-variant pb-stack-sm">
        <p className="font-mono text-mono-sm text-on-surface-variant">PROJECT · {proj.project.name}</p>
        <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">Access control matrix</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          Rows are spaces, columns are members. Each cell sets that member&apos;s role inside that space. Editor can
          propose and resolve changes; reader can only query.
        </p>
      </header>

      {!canEdit ? (
        <div className="bg-surface-container-low border border-outline-variant rounded-DEFAULT px-stack-md py-stack-sm font-body-md text-body-md text-on-surface-variant">
          You can view this matrix because you are a project member, but only project admins can change roles.
        </div>
      ) : null}

      <div className="border border-outline-variant rounded-lg bg-surface-container-lowest overflow-x-auto">
        <table className="w-full border-collapse text-left whitespace-nowrap">
          <thead>
            <tr>
              <th className="p-4 border-b border-r border-outline-variant bg-surface-container-low min-w-[240px] sticky left-0 z-10">
                <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-1">
                  Space ↓ / Member →
                </div>
                <div className="font-headline-md text-headline-md text-on-surface">Spaces ({spaces.length})</div>
              </th>
              {members.map((m) => (
                <th
                  key={m.userId}
                  className="p-4 border-b border-r border-outline-variant bg-surface-container-lowest min-w-[200px]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-surface-container-high flex items-center justify-center font-label-sm text-label-sm">
                      {m.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-label-md text-label-md text-on-surface">{m.name}</div>
                      <div className="font-mono text-mono-sm text-on-surface-variant truncate max-w-[140px]">
                        {m.email}
                      </div>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {spaces.length === 0 ? (
              <tr>
                <td
                  colSpan={members.length + 1}
                  className="p-stack-lg text-center font-body-md text-body-md text-on-surface-variant"
                >
                  No spaces yet. Add one from the project page.
                </td>
              </tr>
            ) : (
              spaces.map((s) => (
                <tr key={s.id} className="hover:bg-surface-container-low transition-colors group">
                  <td className="p-4 border-b border-r border-outline-variant bg-surface-container-lowest sticky left-0 z-10">
                    <div className="flex items-center gap-2">
                      <Icon name="workspaces" className="text-primary text-[18px]" />
                      <span className="font-label-md text-label-md text-on-surface">{s.name}</span>
                    </div>
                    <div className="font-mono text-mono-sm text-on-surface-variant mt-1">{s.id.slice(0, 8)}</div>
                  </td>
                  {members.map((m) => {
                    const role = m.spaceRoles[s.id];
                    return (
                      <td key={m.userId} className="p-3 border-b border-r border-outline-variant align-middle">
                        {canEdit ? (
                          <form
                            action={setSpaceRole}
                            className="flex flex-col gap-2"
                          >
                            <input type="hidden" name="project_id" value={params.id} />
                            <input type="hidden" name="space_id" value={s.id} />
                            <input type="hidden" name="user_id" value={m.userId} />
                            <select
                              name="role"
                              defaultValue={role ?? "none"}
                              className="bg-surface-dim border border-outline-variant text-on-surface font-label-sm text-label-sm rounded-DEFAULT px-2 py-1 focus:outline-none focus:border-primary"
                            >
                              <option value="none">no access</option>
                              <option value="reader">reader</option>
                              <option value="editor">editor</option>
                            </select>
                            <button className="font-label-sm text-label-sm border border-outline-variant px-2 py-1 rounded-DEFAULT text-on-surface hover:bg-surface-variant transition-colors">
                              Save
                            </button>
                          </form>
                        ) : (
                          <RoleBadge role={role} />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role?: "editor" | "reader" }) {
  if (role === "editor") {
    return (
      <span className="inline-flex items-center gap-2 px-2 py-1.5 rounded-DEFAULT bg-on-primary-container/20 border border-primary-container/40 text-primary font-label-sm text-label-sm">
        <Icon name="edit" className="text-[14px]" filled /> editor
      </span>
    );
  }
  if (role === "reader") {
    return (
      <span className="inline-flex items-center gap-2 px-2 py-1.5 rounded-DEFAULT border border-outline-variant bg-surface-dim text-on-surface-variant font-label-sm text-label-sm">
        <Icon name="visibility" className="text-[14px]" /> reader
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 px-2 py-1.5 rounded-DEFAULT border border-dashed border-outline-variant bg-transparent text-outline font-label-sm text-label-sm">
      <Icon name="block" className="text-[14px]" /> no access
    </span>
  );
}

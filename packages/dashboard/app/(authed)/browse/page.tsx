import { redirect } from "next/navigation";
import { auth } from "../../../lib/auth";
import { listProjectsForUser } from "../../../lib/access";
import { BrowseClient } from "./BrowseClient";

export default async function BrowsePage({
  searchParams
}: {
  searchParams?: { project?: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");
  const projects = await listProjectsForUser(session.user.id);
  if (projects.length === 0) {
    return (
      <div className="bg-surface border border-outline-variant rounded-DEFAULT p-stack-md">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">No projects yet</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-2">
          Create a project on the Projects page first. The context browser searches across spaces you have access to
          inside a single project at a time.
        </p>
      </div>
    );
  }
  const initial = searchParams?.project && projects.find((p) => p.id === searchParams.project) ? searchParams.project : projects[0].id;
  return <BrowseClient projects={projects} initialProjectId={initial} />;
}

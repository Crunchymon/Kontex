import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "../../../lib/auth";
import { listProjectsForUser } from "../../../lib/access";
import { Icon } from "../../../components/Icon";
import { PendingClient } from "./PendingClient";

export default async function PendingPage({ searchParams }: { searchParams?: { project?: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const projects = await listProjectsForUser(session.user.id);
  if (projects.length === 0) {
    return (
      <div className="bg-surface border border-outline-variant rounded-DEFAULT p-stack-md">
        <h1 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-2">
          <Icon name="approval_delegation" /> Pending changes
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-2">
          You don&apos;t belong to any projects yet. <Link href="/projects" className="text-primary hover:underline">Create one →</Link>
        </p>
      </div>
    );
  }
  const initial =
    searchParams?.project && projects.find((p) => p.id === searchParams.project)
      ? searchParams.project
      : projects[0].id;
  return <PendingClient projects={projects} initialProjectId={initial} />;
}

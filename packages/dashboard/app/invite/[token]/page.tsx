import { redirect } from "next/navigation";
import { auth } from "../../../lib/auth";
import { acceptTokenInvitation } from "../../../lib/invitations";

export default async function AcceptInvitePage({ params }: { params: { token: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/signin?next=/invite/${params.token}`);
  }

  const accepted = await acceptTokenInvitation(session.user.id, params.token);
  if (!accepted) {
    redirect("/projects?invite=invalid");
  }

  redirect(`/projects/${accepted.projectId}`);
}

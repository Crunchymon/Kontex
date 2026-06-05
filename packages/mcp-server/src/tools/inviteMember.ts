import {
  inviteMemberInput,
  type InviteMemberInput,
  type InviteMemberResult
} from "@kontex/shared";
import type { Database } from "../db.js";
import { requireProjectAdmin, type AuthContext } from "../auth.js";
import { applyProjectInvite } from "./_admin.js";

export const inviteMemberTool = {
  name: "invite_member",
  title: "Invite Member",
  description: "Invite a member to a project and assign a role in one selected space. Missing users are queued as pending invitations.",
  inputSchema: inviteMemberInput,
  destructiveHint: true
};

export async function handleInviteMember(
  db: Database,
  ctx: AuthContext,
  input: InviteMemberInput
): Promise<InviteMemberResult> {
  await requireProjectAdmin(db, ctx.user.id, input.project_id);

  return applyProjectInvite(db, ctx.user.id, {
    projectId: input.project_id,
    email: input.email.trim().toLowerCase(),
    projectRole: input.project_role ?? "member",
    spaceId: input.space_id,
    spaceRole: input.space_role ?? "editor"
  });
}

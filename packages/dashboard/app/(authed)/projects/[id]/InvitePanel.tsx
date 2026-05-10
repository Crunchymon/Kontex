"use client";

import { useState, useTransition } from "react";
import { Icon } from "../../../../components/Icon";
import { createInviteLink, inviteMember, revokeInviteLink } from "../../../../lib/actions";

type SpaceOption = {
  id: string;
  name: string;
};

type InviteLink = {
  id: string;
  token: string | null;
  spaceId: string | null;
  spaceRole: string | null;
  projectRole: string;
  createdAt: string;
  expiresAt: string | null;
};

export function InvitePanel({
  projectId,
  spaces,
  links
}: {
  projectId: string;
  spaces: SpaceOption[];
  links: InviteLink[];
}) {
  const [tab, setTab] = useState<"email" | "link">("email");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const defaultSpaceId = spaces[0]?.id ?? "";

  const handleEmailInvite = (formData: FormData) => {
    startTransition(async () => {
      setStatusMessage(null);
      setCreatedLink(null);
      try {
        const result = await inviteMember(formData);
        setStatusMessage(result.message);
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "Failed to send invite");
      }
    });
  };

  const handleCreateLink = (formData: FormData) => {
    startTransition(async () => {
      setStatusMessage(null);
      try {
        const result = await createInviteLink(formData);
        setCreatedLink(result.inviteUrl);
        setStatusMessage("Sharable invite link created.");
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "Failed to create invite link");
      }
    });
  };

  const copyLink = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setStatusMessage("Link copied.");
  };

  return (
    <section className="bg-surface border border-outline-variant rounded-DEFAULT">
      <header className="px-stack-md py-stack-sm border-b border-outline-variant bg-surface-container-lowest rounded-t-DEFAULT flex items-center justify-between">
        <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
          <Icon name="group_add" className="text-on-surface-variant" /> Invite members
        </h2>
      </header>

      <div className="px-stack-md pt-stack-sm flex gap-2">
        <button
          type="button"
          onClick={() => setTab("email")}
          className={`px-3 py-1.5 rounded-DEFAULT border font-label-sm text-label-sm ${
            tab === "email"
              ? "border-primary text-primary bg-primary/10"
              : "border-outline-variant text-on-surface-variant"
          }`}
        >
          Add by email
        </button>
        <button
          type="button"
          onClick={() => setTab("link")}
          className={`px-3 py-1.5 rounded-DEFAULT border font-label-sm text-label-sm ${
            tab === "link"
              ? "border-primary text-primary bg-primary/10"
              : "border-outline-variant text-on-surface-variant"
          }`}
        >
          Sharable link
        </button>
      </div>

      {tab === "email" ? (
        <form action={handleEmailInvite} className="flex flex-wrap gap-stack-sm p-stack-md border-b border-outline-variant">
          <input type="hidden" name="project_id" value={projectId} />
          <input
            name="email"
            type="email"
            required
            placeholder="teammate@school.edu"
            className="flex-1 min-w-[220px] bg-surface-container-lowest border border-outline-variant text-on-surface font-body-md text-body-md rounded-DEFAULT px-3 py-2"
          />
          <select
            name="space_id"
            defaultValue={defaultSpaceId}
            className="bg-surface-container-lowest border border-outline-variant text-on-surface rounded-DEFAULT px-3 py-2"
            required
          >
            {spaces.map((space) => (
              <option key={space.id} value={space.id}>
                {space.name}
              </option>
            ))}
          </select>
          <select
            name="role"
            defaultValue="member"
            className="bg-surface-container-lowest border border-outline-variant text-on-surface rounded-DEFAULT px-3 py-2"
          >
            <option value="member">project member</option>
            <option value="admin">project admin</option>
          </select>
          <select
            name="space_role"
            defaultValue="editor"
            className="bg-surface-container-lowest border border-outline-variant text-on-surface rounded-DEFAULT px-3 py-2"
          >
            <option value="editor">space editor</option>
            <option value="reader">space reader</option>
          </select>
          <button
            disabled={isPending}
            className="bg-on-surface text-surface px-3 py-2 rounded-DEFAULT font-label-md text-label-md hover:bg-on-surface-variant transition-colors flex items-center gap-2 disabled:opacity-60"
          >
            <Icon name="person_add" className="text-[14px]" /> Invite
          </button>
        </form>
      ) : (
        <div className="p-stack-md border-b border-outline-variant flex flex-col gap-stack-sm">
          <form action={handleCreateLink} className="flex flex-wrap gap-stack-sm">
            <input type="hidden" name="project_id" value={projectId} />
            <select
              name="space_id"
              defaultValue={defaultSpaceId}
              className="bg-surface-container-lowest border border-outline-variant text-on-surface rounded-DEFAULT px-3 py-2"
              required
            >
              {spaces.map((space) => (
                <option key={space.id} value={space.id}>
                  {space.name}
                </option>
              ))}
            </select>
            <select
              name="role"
              defaultValue="member"
              className="bg-surface-container-lowest border border-outline-variant text-on-surface rounded-DEFAULT px-3 py-2"
            >
              <option value="member">project member</option>
              <option value="admin">project admin</option>
            </select>
            <select
              name="space_role"
              defaultValue="editor"
              className="bg-surface-container-lowest border border-outline-variant text-on-surface rounded-DEFAULT px-3 py-2"
            >
              <option value="editor">space editor</option>
              <option value="reader">space reader</option>
            </select>
            <button
              disabled={isPending}
              className="bg-on-surface text-surface px-3 py-2 rounded-DEFAULT font-label-md text-label-md hover:bg-on-surface-variant transition-colors disabled:opacity-60"
            >
              Create link
            </button>
          </form>

          {createdLink ? (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-DEFAULT p-3 flex items-center gap-2">
              <code className="font-mono text-mono-sm text-on-surface-variant break-all flex-1">{createdLink}</code>
              <button
                onClick={() => copyLink(createdLink)}
                className="font-label-sm text-label-sm border border-outline-variant px-2 py-1 rounded-DEFAULT"
              >
                Copy
              </button>
            </div>
          ) : null}
        </div>
      )}

      {statusMessage ? (
        <div className="px-stack-md py-stack-sm font-label-sm text-label-sm text-primary">{statusMessage}</div>
      ) : null}

      {links.length > 0 ? (
        <ul className="divide-y divide-outline-variant">
          {links.map((link) => (
            <li key={link.id} className="px-stack-md py-stack-sm flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-label-md text-label-md text-on-surface">
                  {link.spaceRole ?? "editor"} on {spaces.find((s) => s.id === link.spaceId)?.name ?? "Unknown space"}
                </div>
                <div className="font-mono text-mono-sm text-on-surface-variant">
                  created {new Date(link.createdAt).toLocaleString()}
                </div>
              </div>
              <form action={revokeInviteLink}>
                <input type="hidden" name="invite_id" value={link.id} />
                <input type="hidden" name="project_id" value={projectId} />
                <button className="font-label-sm text-label-sm border border-error/50 text-error px-2 py-1 rounded-DEFAULT">
                  Revoke
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

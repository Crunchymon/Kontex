import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { oauthClients, oauthCodes } from "@kontex/shared/schema";
import { db } from "../../../lib/db";
import { auth } from "../../../lib/auth";
import { Logo } from "../../../components/Logo";

const AUTH_CODE_TTL_MS = 10 * 60 * 1000;

type AuthorizePageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

function single(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function normalizeRedirectUri(value: string): string | null {
  try {
    return new URL(value).toString();
  } catch {
    return null;
  }
}

function withOAuthParams(redirectUri: string, params: Record<string, string | undefined>): string {
  const url = new URL(redirectUri);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
}

function signInReturnPath(searchParams: AuthorizePageProps["searchParams"]): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
    } else if (value) {
      params.set(key, value);
    }
  }
  const query = params.toString();
  return `/oauth/authorize${query ? `?${query}` : ""}`;
}

function OAuthError({ title, message }: { title: string; message: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-gutter dot-grid">
      <section className="w-full max-w-md rounded-lg border border-outline-variant bg-surface p-8">
        <Logo size="sm" withWordmark />
        <h1 className="mt-8 font-headline-lg text-headline-lg text-on-surface">{title}</h1>
        <p className="mt-3 font-body-md text-body-md text-on-surface-variant">{message}</p>
      </section>
    </main>
  );
}

export default async function OAuthAuthorizePage({ searchParams }: AuthorizePageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    const returnPath = signInReturnPath(searchParams);
    redirect(`/sign-in?redirect_url=${encodeURIComponent(returnPath)}`);
  }

  const clientId = single(searchParams.client_id);
  const redirectUri = normalizeRedirectUri(single(searchParams.redirect_uri));
  const state = single(searchParams.state) || undefined;
  const codeChallenge = single(searchParams.code_challenge);
  const codeChallengeMethod = single(searchParams.code_challenge_method);
  const responseType = single(searchParams.response_type) || "code";

  if (!clientId || !redirectUri || !codeChallenge || codeChallengeMethod !== "S256" || responseType !== "code") {
    return (
      <OAuthError
        title="Invalid OAuth request"
        message="The connector did not send the required authorization parameters."
      />
    );
  }

  const [client] = await db()
    .select()
    .from(oauthClients)
    .where(eq(oauthClients.clientId, clientId))
    .limit(1);

  if (!client || !client.redirectUris.includes(redirectUri)) {
    return (
      <OAuthError
        title="Unknown connector"
        message="This OAuth client is not registered for the supplied redirect URI."
      />
    );
  }

  const code = randomBytes(32).toString("base64url");
  await db().insert(oauthCodes).values({
    code,
    clientId,
    userId: session.user.id,
    codeChallenge,
    redirectUri,
    expiresAt: new Date(Date.now() + AUTH_CODE_TTL_MS)
  });

  redirect(withOAuthParams(redirectUri, { code, state }));
}

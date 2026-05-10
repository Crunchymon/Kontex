import { signIn, auth } from "../../lib/auth";
import { redirect } from "next/navigation";
import { Logo } from "../../components/Logo";
import { Icon } from "../../components/Icon";

export default async function SignInPage({
  searchParams
}: {
  searchParams?: { next?: string };
}) {
  const session = await auth();
  if (session?.user) redirect(searchParams?.next ?? "/overview");

  async function handleSignIn() {
    "use server";
    await signIn("google", { redirectTo: searchParams?.next ?? "/overview" });
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-gutter dot-grid">
      <div className="bg-surface border border-outline-variant rounded-xl p-stack-lg max-w-md w-full flex flex-col gap-stack-md hero-gradient">
        <Logo size="lg" withWordmark withTagline />
        <h1 className="font-headline-lg text-headline-lg text-on-surface mt-stack-md">Sign in to Kontex</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Use your Google account. On first sign-in we provision a user record and a session-scoped API key for the
          dashboard. Nothing else.
        </p>
        <form action={handleSignIn}>
          <button
            type="submit"
            className="w-full mt-stack-sm bg-on-surface text-surface px-4 py-3 rounded-DEFAULT font-label-md text-label-md hover:bg-on-surface-variant transition-colors flex items-center justify-center gap-2"
          >
            <Icon name="login" className="text-[16px]" />
            Continue with Google
          </button>
        </form>
        <p className="font-label-sm text-label-sm text-on-surface-variant mt-stack-sm">
          To use Kontex from your LLM, generate an API key after signing in and paste it into your client config.
        </p>
      </div>
    </main>
  );
}

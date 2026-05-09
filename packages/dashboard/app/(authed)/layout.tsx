import { redirect } from "next/navigation";
import { auth, signOut } from "../../lib/auth";
import { Sidebar } from "../../components/Sidebar";
import { Topbar } from "../../components/Topbar";

export default async function AuthedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin");
  }

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="ml-64 flex-1 min-h-screen flex flex-col">
        <Topbar
          title="Kontex"
          subtitle="Institutional memory for AI-native teams"
          user={session.user}
          rightSlot={
            <form action={handleSignOut}>
              <button className="font-label-md text-label-md bg-transparent border border-outline-variant text-on-surface px-3 py-1.5 rounded-DEFAULT hover:bg-surface-container transition-colors">
                Sign out
              </button>
            </form>
          }
        />
        <main className="flex-1 p-gutter relative dot-grid">
          <div className="relative z-10 max-w-container-max mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}

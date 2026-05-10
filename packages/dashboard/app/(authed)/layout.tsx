import { redirect } from "next/navigation";
import { auth, signOut } from "../../lib/auth";
import { Sidebar } from "../../components/Sidebar";
import { Topbar } from "../../components/Topbar";
import { UserMenu } from "../../components/UserMenu";

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
          userMenu={<UserMenu user={session.user} signOutAction={handleSignOut} />}
        />
        <main className="flex-1 p-gutter relative dot-grid">
          <div className="relative z-10 max-w-container-max mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}

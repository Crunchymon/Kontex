import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { Sidebar } from "../../components/Sidebar";
import { Topbar } from "../../components/Topbar";
import { UserButton } from "@clerk/nextjs";

export default async function AuthedLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="ml-64 flex-1 min-h-screen flex flex-col">
        <Topbar
          title="Kontex"
          subtitle="Institutional memory for AI-native teams"
          userMenu={<UserButton />}
        />
        <main className="flex-1 p-gutter relative dot-grid">
          <div className="relative z-10 max-w-container-max mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}

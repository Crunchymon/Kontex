import Link from "next/link";

const linkClass = "text-sm text-blue-700 hover:underline";

export function Nav() {
  return (
    <nav className="flex gap-4 border-b bg-white px-6 py-4">
      <Link className={linkClass} href="/">
        Current Context
      </Link>
      <Link className={linkClass} href="/prs">
        Open PRs
      </Link>
      <Link className={linkClass} href="/history">
        History
      </Link>
    </nav>
  );
}

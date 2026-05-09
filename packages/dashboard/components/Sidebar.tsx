"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { Icon } from "./Icon";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  badge?: number;
};

const NAV: NavItem[] = [
  { href: "/projects", label: "Projects", icon: "folder_managed" },
  { href: "/browse", label: "Context", icon: "manage_search" },
  { href: "/pending", label: "Pending", icon: "approval_delegation" },
  { href: "/keys", label: "API Keys", icon: "key" }
];

export function Sidebar() {
  const pathname = usePathname() ?? "";
  return (
    <nav className="h-screen w-64 flex flex-col border-r border-outline-variant bg-surface-dim fixed left-0 top-0 z-40">
      <div className="p-gutter border-b border-outline-variant">
        <Link href="/projects" className="flex items-center gap-stack-sm">
          <Logo size="md" withWordmark withTagline />
        </Link>
      </div>
      <div className="flex-1 py-stack-md flex flex-col gap-stack-xs px-stack-sm overflow-y-auto">
        {NAV.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-stack-sm px-stack-sm py-2 rounded-DEFAULT transition-colors duration-150 active:scale-[0.98] ${
                active
                  ? "bg-surface-container-highest text-primary border-r-2 border-primary"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
              }`}
            >
              <Icon name={item.icon} className="text-[20px] shrink-0" filled={active} />
              <span className="font-headline-md text-headline-md tracking-tight flex-1">{item.label}</span>
              {item.badge ? (
                <span className="bg-primary text-on-primary font-label-sm text-label-sm px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
      <div className="p-stack-sm border-t border-outline-variant flex flex-col gap-stack-xs">
        <Link
          href="/keys"
          className="flex items-center gap-stack-sm px-stack-sm py-1.5 rounded-DEFAULT text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
        >
          <Icon name="menu_book" className="text-[18px]" />
          <span className="font-label-md text-label-md">Documentation</span>
        </Link>
        <a
          href="https://github.com/anthropics/claude-ai-mcp/issues/112"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-stack-sm px-stack-sm py-1.5 rounded-DEFAULT text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
        >
          <Icon name="contact_support" className="text-[18px]" />
          <span className="font-label-md text-label-md">Claude bridge</span>
        </a>
      </div>
    </nav>
  );
}

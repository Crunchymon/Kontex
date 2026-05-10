import Link from "next/link";
import { Icon } from "./Icon";

type Props = {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  userMenu?: React.ReactNode;
};

export function Topbar({ title, subtitle, rightSlot, userMenu }: Props) {
  return (
    <header className="h-14 border-b border-outline-variant bg-surface-dim flex items-center justify-between px-gutter sticky top-0 z-30 backdrop-blur">
      <div className="flex items-center gap-4 min-w-0">
        <div className="min-w-0">
          <h1 className="font-headline-md text-headline-md text-on-surface truncate">
            <Link href="/projects" className="hover:text-primary transition-colors">
              {title}
            </Link>
          </h1>
          {subtitle ? (
            <p className="font-label-sm text-label-sm text-on-surface-variant truncate">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {rightSlot}
        <div className="w-px h-6 bg-outline-variant mx-1" />
        <button className="text-on-surface-variant hover:text-on-surface transition-colors" aria-label="Notifications">
          <Icon name="notifications" />
        </button>
        {userMenu}
      </div>
    </header>
  );
}

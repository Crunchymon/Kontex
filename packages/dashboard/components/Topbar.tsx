import { Icon } from "./Icon";

type Props = {
  title: string;
  subtitle?: string;
  user?: { name?: string | null; email?: string | null; image?: string | null };
  rightSlot?: React.ReactNode;
};

function initials(input?: string | null) {
  if (!input) return "?";
  const parts = input.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function Topbar({ title, subtitle, user, rightSlot }: Props) {
  return (
    <header className="h-14 border-b border-outline-variant bg-surface-dim flex items-center justify-between px-gutter sticky top-0 z-30 backdrop-blur">
      <div className="flex items-center gap-4 min-w-0">
        <div className="min-w-0">
          <h1 className="font-headline-md text-headline-md text-on-surface truncate">{title}</h1>
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
        <div
          className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant ml-2 flex items-center justify-center overflow-hidden"
          title={user?.name ?? user?.email ?? ""}
        >
          {user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt={user.name ?? "User"} className="w-full h-full object-cover" />
          ) : (
            <span className="font-label-md text-label-md text-on-surface">
              {initials(user?.name ?? user?.email)}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}

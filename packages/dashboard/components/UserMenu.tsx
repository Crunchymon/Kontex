"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";

function initials(input?: string | null) {
  if (!input) return "?";
  const parts = input.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function UserMenu({
  user,
  signOutAction
}: {
  user?: { name?: string | null; email?: string | null; image?: string | null };
  signOutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant ml-2 flex items-center justify-center overflow-hidden"
        title={user?.name ?? user?.email ?? ""}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {user?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt={user.name ?? "User"} className="w-full h-full object-cover" />
        ) : (
          <span className="font-label-md text-label-md text-on-surface">
            {initials(user?.name ?? user?.email)}
          </span>
        )}
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-64 rounded-DEFAULT border border-outline-variant bg-surface shadow-lg z-50 p-3 flex flex-col gap-3">
          <div>
            <p className="font-label-md text-label-md text-on-surface truncate">{user?.name ?? "User"}</p>
            <p className="font-mono text-mono-sm text-on-surface-variant truncate">{user?.email}</p>
          </div>
          <form action={signOutAction}>
            <button className="w-full flex items-center justify-center gap-2 font-label-md text-label-md border border-outline-variant text-on-surface px-3 py-1.5 rounded-DEFAULT hover:bg-surface-container transition-colors">
              <Icon name="logout" className="text-[16px]" />
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

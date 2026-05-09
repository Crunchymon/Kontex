type Props = {
  size?: "sm" | "md" | "lg";
  withWordmark?: boolean;
  withTagline?: boolean;
};

export function Logo({ size = "md", withWordmark = true, withTagline = false }: Props) {
  const dim = size === "sm" ? 24 : size === "lg" ? 40 : 32;
  return (
    <div className="flex items-center gap-stack-sm">
      <div
        className="rounded-DEFAULT bg-surface-container-highest border border-outline-variant flex items-center justify-center shrink-0 overflow-hidden"
        style={{ width: dim, height: dim }}
      >
        <span
          className="font-mono font-semibold text-on-surface"
          style={{ fontSize: dim === 40 ? 20 : dim === 32 ? 16 : 12 }}
        >
          K
        </span>
      </div>
      {withWordmark ? (
        <div className="flex flex-col leading-none">
          <span
            className={`font-bold text-on-surface tracking-tighter ${
              size === "lg" ? "text-headline-xl" : size === "sm" ? "text-headline-md" : "text-headline-lg"
            }`}
          >
            KONTEX
          </span>
          {withTagline ? (
            <span className="font-label-sm text-label-sm text-on-surface-variant mt-1">
              Institutional Intelligence
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

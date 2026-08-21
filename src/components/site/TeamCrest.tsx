import { cn } from "@/lib/utils";

export function TeamCrest({
  name,
  short,
  crest,
  size = "md",
  className,
}: {
  name?: string;
  short?: string;
  crest?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizes = {
    sm: "h-7 w-7 text-[10px]",
    md: "h-10 w-10 text-xs",
    lg: "h-16 w-16 text-base",
    xl: "h-24 w-24 text-2xl",
  };
  const label = short ?? name?.slice(0, 3).toUpperCase() ?? "—";

  if (crest) {
    return (
      <img
        src={crest}
        alt={`Escudo do ${name ?? "clube"}`}
        className={cn(sizes[size], "rounded-full object-cover", className)}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        sizes[size],
        "inline-flex shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 font-display font-extrabold uppercase tracking-tight text-foreground",
        className,
      )}
    >
      {label}
    </span>
  );
}

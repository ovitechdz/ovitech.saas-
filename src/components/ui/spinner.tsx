import { cn } from "@/lib/cn";

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2">
      <span
        className={cn("size-5 animate-spin rounded-full border-2 border-gold border-t-transparent", className)}
        aria-hidden="true"
      />
      {label ? <span className="text-sm text-muted">{label}</span> : null}
    </span>
  );
}
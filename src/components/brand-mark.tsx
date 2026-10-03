import { cn } from "@/lib/cn";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-2 ring-1 ring-gold/45",
        className,
      )}
    >
      <img
        src="/ovitech-logo.jpeg"
        alt="OVITECH"
        className="size-full object-cover"
      />
    </span>
  );
}

import { formatDateTime } from "@/lib/format";

export function TimeText({
  iso,
  className,
}: {
  iso: string | null | undefined;
  className?: string;
}) {
  return (
    <span className={className} suppressHydrationWarning>
      {formatDateTime(iso)}
    </span>
  );
}

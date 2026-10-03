import { Badge } from "@/components/ui/badge";
import { useAppT } from "@/i18n/hooks";
import type { SyncStatus } from "@/lib/types";

const tone: Record<SyncStatus, "muted" | "gold" | "leaf" | "warn" | "danger" | "ok"> = {
  local: "gold",
  pending: "warn",
  syncing: "gold",
  synced: "ok",
  failed: "danger",
  conflict: "warn",
};

export function SyncChip({ status }: { status: SyncStatus }) {
  const t = useAppT();
  return <Badge tone={tone[status]}>{t(`app.syncstate.${status}`)}</Badge>;
}

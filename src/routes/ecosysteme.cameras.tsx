import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Camera } from "lucide-react";
import { DevicePage } from "@/components/ecosysteme-device";
import { useFarmStore } from "@/lib/store";

export const Route = createFileRoute("/ecosysteme/cameras")({ component: CamerasPage });

function CamerasPage() {
  const animals = useFarmStore((s) => s.animals);

  const stats = useMemo(() => {
    const actifs = animals.filter((a) => a.status === "actif");
    const scanRecents = actifs.filter(
      (a) => a.lastScanAt !== null && Date.now() - new Date(a.lastScanAt).getTime() < 14 * 86400000,
    );
    const pct = actifs.length > 0 ? Math.round((scanRecents.length / actifs.length) * 100) : 0;
    return [
      { key: "app.ecosysteme.cameras.statCouverture", value: `${pct} %` },
      { key: "app.ecosysteme.cameras.statLot", value: actifs.length, sub: "app.ecosysteme.statsAnimaux" },
      { key: "app.ecosysteme.cameras.statLatest", value: scanRecents.length },
    ];
  }, [animals]);

  return <DevicePage device="cameras" icon={Camera} stats={stats} />;
}
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { DoorOpen } from "lucide-react";
import { DevicePage } from "@/components/ecosysteme-device";
import { useFarmStore } from "@/lib/store";

export const Route = createFileRoute("/ecosysteme/portails")({ component: PortailsPage });

function PortailsPage() {
  const animals = useFarmStore((s) => s.animals);
  const events = useFarmStore((s) => s.events);

  const stats = useMemo(() => {
    const actifs = animals.filter((a) => a.status === "actif");
    const identifies = actifs.filter((a) => a.lastScanAt !== null);
    const pct = actifs.length > 0 ? Math.round((identifies.length / actifs.length) * 100) : 0;
    const scans = events.filter((e) => e.type === "scan").length;
    return [
      { key: "app.ecosysteme.portails.statIdent", value: `${pct} %` },
      { key: "app.ecosysteme.portails.statPassages", value: scans },
      { key: "app.ecosysteme.portails.statParcs", value: actifs.length, sub: "app.ecosysteme.statsAnimaux" },
    ];
  }, [animals, events]);

  return <DevicePage device="portails" icon={DoorOpen} stats={stats} />;
}
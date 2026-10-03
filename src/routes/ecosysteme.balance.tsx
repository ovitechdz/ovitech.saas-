import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Scale } from "lucide-react";
import { DevicePage } from "@/components/ecosysteme-device";
import { useFarmStore } from "@/lib/store";
import { formatKg } from "@/lib/format";

export const Route = createFileRoute("/ecosysteme/balance")({ component: BalancePage });

function BalancePage() {
  const animals = useFarmStore((s) => s.animals);
  const weights = useFarmStore((s) => s.weights);

  const stats = useMemo(() => {
    const actifs = animals.filter((a) => a.status === "actif");
    const avecPoids = actifs.filter((a) => a.weightKg !== null);
    const pct = actifs.length > 0 ? Math.round((avecPoids.length / actifs.length) * 100) : 0;
    return [
      { key: "app.ecosysteme.balance.statPesees", value: weights.length },
      { key: "app.ecosysteme.balance.statCouverture", value: `${pct} %` },
      { key: "app.ecosysteme.balance.statMoyenne", value: formatKg(averageKg(actifs)) },
    ];
  }, [animals, weights]);

  return <DevicePage device="balance" icon={Scale} stats={stats} />;
}

function averageKg(animals: { weightKg: number | null }[]) {
  const vals = animals.map((a) => a.weightKg).filter((v): v is number => v != null);
  if (vals.length === 0) return null;
  return vals.reduce((acc, v) => acc + v, 0) / vals.length;
}
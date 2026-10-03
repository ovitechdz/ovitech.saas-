import type { FeedLot } from "./types.ts";

/** Find the active forage (or hybrid-as-forage) lot, matching ration.ts/kpis.ts. */
export function forageLot(feed: FeedLot[]): FeedLot | undefined {
  return feed.find(
    (f) => (f.kind === "fourrage" || f.kind === "hybride") && f.available,
  );
}

/** Find the active concentrate lot. */
export function concentrateLot(feed: FeedLot[]): FeedLot | undefined {
  return feed.find((f) => f.kind === "concentre" && f.available);
}

/** Find the active hybrid lot (price fallback for forage/concentrate). */
export function hybridLot(feed: FeedLot[]): FeedLot | undefined {
  return feed.find((f) => f.kind === "hybride" && f.available);
}

/** Unit price for forage, falling back to the hybrid lot when no dedicated
 *  forage lot is available — single source of truth (was duplicated in
 *  ration.ts and kpis.ts). */
export function foragePrice(feed: FeedLot[]): number {
  return forageLot(feed)?.costPerKg ?? hybridLot(feed)?.costPerKg ?? 0;
}

/** Unit price for concentrate, with the same hybrid fallback. */
export function concentratePrice(feed: FeedLot[]): number {
  return concentrateLot(feed)?.costPerKg ?? hybridLot(feed)?.costPerKg ?? 0;
}

/** Total available stock across forage-compatible lots (fourrage + hybride). */
export function forageStock(feed: FeedLot[]): number {
  return feed
    .filter((f) => (f.kind === "fourrage" || f.kind === "hybride") && f.available)
    .reduce((s, f) => s + f.stockKg, 0);
}

/** Total available stock in concentrate-compatible lots (concentre + hybride),
 *  mirroring `forageStock` — single source for the feed-units coverage reads. */
export function concentrateStock(feed: FeedLot[]): number {
  return feed
    .filter((f) => (f.kind === "concentre" || f.kind === "hybride") && f.available)
    .reduce((s, f) => s + f.stockKg, 0);
}

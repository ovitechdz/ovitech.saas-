import type { FeedLot } from "./types.ts";
import { round1 } from "./numeric.ts";

/** Pure inventory deduction: serve `forageKg` + `concentrateKg` from the feed
 *  lots (forage + hybrid, then concentrate + hybrid), returning a new feed
 *  array. Never mutates inputs; non-available/empty lots are left untouched.
 *  Kept here (not in the store) so it is a testable, server-shareable domain
 *  rule — a seed for the future multi-tenant inventory service. */
/** Vrai si le stock actuel couvre exactement la demande (même logique de
 *  prise que `deductFeed`, sans rien consommer — un lot ne sert qu'un seul
 *  besoin, le fourrage d'abord). Utilisé pour refuser une distribution avant
 *  tout débit partiel. */
export function feedCovers(
  feed: FeedLot[],
  forageKg: number,
  concentrateKg: number,
): boolean {
  let forageLeft = forageKg;
  let concLeft = concentrateKg;
  for (const f of feed) {
    if (!f.available || f.stockKg <= 0) continue;
    if ((f.kind === "fourrage" || f.kind === "hybride") && forageLeft > 0) {
      forageLeft -= Math.min(f.stockKg, forageLeft);
    } else if ((f.kind === "concentre" || f.kind === "hybride") && concLeft > 0) {
      concLeft -= Math.min(f.stockKg, concLeft);
    }
  }
  return forageLeft <= 1e-9 && concLeft <= 1e-9;
}

export function deductFeed(
  feed: FeedLot[],
  forageKg: number,
  concentrateKg: number,
): FeedLot[] {
  let forageLeft = forageKg;
  let concLeft = concentrateKg;
  return feed.map((f) => {
    if (!f.available || f.stockKg <= 0) return f;
    if ((f.kind === "fourrage" || f.kind === "hybride") && forageLeft > 0) {
      const take = Math.min(f.stockKg, forageLeft);
      forageLeft -= take;
      return { ...f, stockKg: round1(f.stockKg - take) };
    }
    if ((f.kind === "concentre" || f.kind === "hybride") && concLeft > 0) {
      const take = Math.min(f.stockKg, concLeft);
      concLeft -= take;
      return { ...f, stockKg: round1(f.stockKg - take) };
    }
    return f;
  });
}

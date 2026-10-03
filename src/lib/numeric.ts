/** Shared numeric helpers. Single source of truth (previously duplicated in
 *  store.ts and nutrition-engine.ts). */
export const DAY_MS = 24 * 60 * 60 * 1000;

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function round0(n: number): number {
  return Math.round(n);
}

export function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

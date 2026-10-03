import type { NetworkState, SyncStatus } from "../types.ts";

function randomId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }
  return Math.random().toString(36).slice(2, 12);
}

export function uid(prefix: string): string {
  return `${prefix}-${randomId()}`;
}

export function defaultStatus(network: NetworkState): SyncStatus {
  return network === "online" ? "pending" : "local";
}
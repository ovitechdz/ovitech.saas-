import { getSql } from "@/lib/db";
import {
  lookupFarmMembership,
  roleAllowed,
  type FarmMembership,
  type FarmRole,
} from "./farm-membership";
import { UnauthorizedError } from "./verify.server";

export type { FarmRole } from "./farm-membership";

export async function requireFarmMembership(
  userId: string,
  farmId: string,
): Promise<FarmMembership> {
  const sql = await getSql();
  const membership = await lookupFarmMembership(sql, userId, farmId);
  if (!membership) throw new UnauthorizedError();
  return membership;
}

export async function requireFarmRole(
  userId: string,
  farmId: string,
  roles: FarmRole[],
): Promise<FarmMembership> {
  const membership = await requireFarmMembership(userId, farmId);
  if (!roleAllowed(membership, roles)) throw new UnauthorizedError();
  return membership;
}

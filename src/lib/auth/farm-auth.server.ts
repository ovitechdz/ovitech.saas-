import { getSql } from "@/lib/db";
import { UnauthorizedError } from "./verify.server";

export type FarmRole = "OWNER" | "MANAGER" | "OPERATOR";

export async function requireFarmMembership(userId: string, farmId: string) {
  const sql = await getSql();
  const rows = await sql<any>`select user_id, farm_id, role from farm_memberships where user_id = ${userId} and farm_id = ${farmId} limit 1`;
  if (!rows || rows.length === 0) throw new UnauthorizedError();
  return rows[0] as { user_id: string; farm_id: string; role: FarmRole };
}

export async function requireFarmRole(userId: string, farmId: string, roles: FarmRole[]) {
  const m = await requireFarmMembership(userId, farmId);
  if (!roles.includes(m.role)) throw new UnauthorizedError();
  return m;
}

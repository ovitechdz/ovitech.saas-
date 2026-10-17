/**
 * Primitives d'appartenance à une ferme — **pures** (aucun import serveur).
 *
 * Partagées entre le garde serveur (`farm-auth.server.ts`, qui y branche
 * `getSql()` et traduit l'absence d'adhésion en `UnauthorizedError`) et les
 * tests d'intégration base de données. La requête réelle vit donc ici : les
 * tests exercent exactement le SQL que le serveur exécute, sans divergence.
 */

export type FarmRole = "OWNER" | "MANAGER" | "OPERATOR";

export interface FarmMembership {
  user_id: string;
  farm_id: string;
  role: FarmRole;
}

/** Surface SQL minimale (tagged template) — satisfaite par le `Sql` de `@/lib/db`. */
export type TaggedSql = <T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<T[]>;

/**
 * Ligne d'adhésion de `userId` sur `farmId`, ou `null` si l'utilisateur n'est
 * pas membre de cette ferme — toute tentative d'accès inter-fermes est donc
 * refusée à la source (le `where` porte sur `user_id` ET `farm_id`).
 */
export async function lookupFarmMembership(
  sql: TaggedSql,
  userId: string,
  farmId: string,
): Promise<FarmMembership | null> {
  const rows =
    await sql<FarmMembership>`select user_id, farm_id, role from farm_memberships where user_id = ${userId} and farm_id = ${farmId} limit 1`;
  return rows && rows.length > 0 ? rows[0]! : null;
}

/** Vrai lorsque le rôle de l'adhésion figure dans `roles`. */
export function roleAllowed(
  membership: Pick<FarmMembership, "role">,
  roles: readonly FarmRole[],
): boolean {
  return roles.includes(membership.role);
}

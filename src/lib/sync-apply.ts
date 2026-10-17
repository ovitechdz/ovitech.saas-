/**
 * Primitives de persistance de synchronisation — **pures** (aucun import
 * serveur). Contiennent le SQL réel utilisé par `syncAnimals`
 * (`server/routes/api/sync/animals.post.ts`), partagé avec les tests
 * d'intégration base de données pour éviter toute divergence test↔serveur.
 *
 * L'atomicité (begin/commit/rollback) reste orchestrée par l'appelant : ces
 * primitives n'exécutent qu'une instruction chacune.
 */

/** Surface SQL minimale (tagged template) — satisfaite par le `Sql` de `@/lib/db`. */
export type TaggedSql = <T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<T[]>;

export interface AnimalPayload {
  id?: string;
  farmId?: string;
  rfid: string;
  code: string;
  sex: string;
  breed: string;
  birthDate: string;
  weightKg: number | null;
  bcs: number | null;
  stage: string;
  pen: string;
  status: string;
  lastScanAt: string | null;
  adgKg: number | null;
  notes: string;
}

/** Levée quand une charge utile porte un `farmId` différent de la ferme cible
 *  (tentative d'écriture inter-fermes) — l'appelant l'annule par rollback. */
export class AnimalFarmMismatchError extends Error {
  constructor() {
    super("animal_farm_mismatch");
    this.name = "AnimalFarmMismatchError";
  }
}

/**
 * Réserve un identifiant de mutation pour une ferme. Renvoie `false` quand la
 * mutation a déjà été appliquée (`on conflict ... do nothing` sur la clé
 * primaire `(farm_id, mutation_id)`) — la synchronisation est donc idempotente
 * et strictement cloisonnée par ferme.
 */
export async function claimSyncMutation(
  sql: TaggedSql,
  farmId: string,
  mutationId: string,
): Promise<boolean> {
  const claim =
    await sql`insert into sync_idempotency (mutation_id, farm_id, created_at) values (${mutationId}, ${farmId}, now()) on conflict (farm_id, mutation_id) do nothing returning mutation_id`;
  return Array.isArray(claim) && claim.length > 0;
}

/**
 * Insère/actualise un animal, toujours rattaché à `farmId`. Refuse une charge
 * utile dont le `farmId` diverge de la ferme cible (garde d'isolation).
 */
export async function upsertAnimal(
  sql: TaggedSql,
  farmId: string,
  a: AnimalPayload,
): Promise<void> {
  const id = a && a.id ? a.id : crypto.randomUUID();
  if (a && a.farmId && a.farmId !== farmId) {
    throw new AnimalFarmMismatchError();
  }
  await sql`insert into animals (id, farm_id, rfid, code, sex, breed, birth_date, weight_kg, bcs, stage, pen, status, last_scan_at, adg_kg, notes, updated_at)
    values (${id}, ${farmId}, ${a.rfid}, ${a.code}, ${a.sex}, ${a.breed}, ${a.birthDate}, ${a.weightKg}, ${a.bcs}, ${a.stage}, ${a.pen}, ${a.status}, ${a.lastScanAt}, ${a.adgKg}, ${a.notes}, now())
    on conflict (farm_id, id) do update set
      rfid = excluded.rfid, code = excluded.code, sex = excluded.sex, breed = excluded.breed, birth_date = excluded.birth_date, weight_kg = excluded.weight_kg, bcs = excluded.bcs, stage = excluded.stage, pen = excluded.pen, status = excluded.status, last_scan_at = excluded.last_scan_at, adg_kg = excluded.adg_kg, notes = excluded.notes, updated_at = now()`;
}

export interface SyncApplyResult {
  duplicate: boolean;
  count: number;
}

/**
 * Corps atomique d'une synchronisation d'animaux : réserve la mutation puis
 * applique tous les upserts **sur la même surface transactionnelle `tx`**. Toute
 * erreur (`AnimalFarmMismatchError` incluse) doit être propagée à l'appelant,
 * qui l'annule par `ROLLBACK` — c'est ce qui garantit qu'une mutation
 * partiellement écrite n'est jamais validée.
 *
 * Une mutation déjà appliquée (`duplicate`) n'écrit rien : le `COMMIT` devient
 * un no-op sans effet.
 */
export async function applyAnimalSyncMutation(
  tx: TaggedSql,
  farmId: string,
  mutationId: string,
  animals: readonly AnimalPayload[],
): Promise<SyncApplyResult> {
  const claimed = await claimSyncMutation(tx, farmId, mutationId);
  if (!claimed) return { duplicate: true, count: 0 };
  for (const animal of animals) {
    await upsertAnimal(tx, farmId, animal);
  }
  return { duplicate: false, count: animals.length };
}

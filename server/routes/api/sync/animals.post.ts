import { authMiddleware } from "@/lib/auth/middleware";
import { requireFarmMembership } from "@/lib/auth/farm-auth.server";
import { getSql } from "@/lib/db";
import { createServerFn } from "@tanstack/react-start";

export const syncAnimals = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context, data }: any) => {
    const userId = context.userId;
    const body = data || {};
    if (!body.farmId || !body.mutationId) {
      return { ok: false, code: "bad_request" };
    }
    await requireFarmMembership(userId, body.farmId);
    const sql = await getSql();
    await sql`begin`;
    try {
      const claim = await sql`insert into sync_idempotency (mutation_id, farm_id, created_at) values (${body.mutationId}, ${body.farmId}, now()) on conflict (farm_id, mutation_id) do nothing returning mutation_id`;
      if (!claim || claim.length === 0) {
        await sql`rollback`;
        return { ok: true, acked: true, duplicate: true };
      }
      const animals = Array.isArray(body.animals) ? body.animals : [];
      for (let i = 0; i < animals.length; i++) {
        const a = animals[i];
        const id = a && a.id ? a.id : crypto.randomUUID();
        if (a && a.farmId && a.farmId !== body.farmId) {
          throw new Error("animal_farm_mismatch");
        }
        await sql`insert into animals (id, farm_id, rfid, code, sex, breed, birth_date, weight_kg, bcs, stage, pen, status, last_scan_at, adg_kg, notes, updated_at)
          values (${id}, ${body.farmId}, ${a.rfid}, ${a.code}, ${a.sex}, ${a.breed}, ${a.birthDate}, ${a.weightKg}, ${a.bcs}, ${a.stage}, ${a.pen}, ${a.status}, ${a.lastScanAt}, ${a.adgKg}, ${a.notes}, now())
          on conflict (farm_id, id) do update set
            rfid = excluded.rfid, code = excluded.code, sex = excluded.sex, breed = excluded.breed, birth_date = excluded.birth_date, weight_kg = excluded.weight_kg, bcs = excluded.bcs, stage = excluded.stage, pen = excluded.pen, status = excluded.status, last_scan_at = excluded.last_scan_at, adg_kg = excluded.adg_kg, notes = excluded.notes, updated_at = now()`;
      }
      await sql`commit`;
    } catch {
      try {
        await sql`rollback`;
      } catch {
        // Preserve the original sync failure if rollback also fails.
      }
      return { ok: false, code: "server_error" };
    }
    return { ok: true, acked: true, count: (Array.isArray(body.animals) ? body.animals.length : 0) };
  });

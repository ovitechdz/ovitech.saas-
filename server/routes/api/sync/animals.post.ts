import { requireFarmMembership } from "@/lib/auth/farm-auth.server";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { applyAnimalSyncMutation } from "@/lib/sync-apply";
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
    const animals = Array.isArray(body.animals) ? body.animals : [];
    try {
      // `transaction` pins BEGIN + claim + upserts + COMMIT to ONE pooled
      // connection; on any error it ROLLBACKs the whole mutation.
      const result = await sql.transaction((tx) =>
        applyAnimalSyncMutation(tx, body.farmId, body.mutationId, animals),
      );
      if (result.duplicate) {
        return { ok: true, acked: true, duplicate: true };
      }
      return { ok: true, acked: true, count: result.count };
    } catch {
      return { ok: false, code: "server_error" };
    }
  });

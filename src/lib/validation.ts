import { z } from "zod";

/** Weight in kg: optional, but when present must be a finite positive number
 *  bounded to a plausible live-animal maximum. `Infinity` (ex: "1e309") and
 *  absurd values are rejected to avoid corrupting the ration engine. */
export const MAX_WEIGHT_KG = 1000;

export const weightSchema = z
  .union([z.literal(""), z.string().trim()])
  .transform((v, ctx) => {
    if (v === "") return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0 || n > MAX_WEIGHT_KG) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid weight" });
      return z.NEVER;
    }
    return n;
  });

/** Body condition score (NEC): optional, must be within [1, 5] when present. */
export const bcsSchema = z
  .union([z.literal(""), z.string().trim()])
  .transform((v, ctx) => {
    if (v === "") return null;
    const n = Number(v);
    if (Number.isNaN(n) || n < 1 || n > 5) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "NEC must be 1–5" });
      return z.NEVER;
    }
    return n;
  });

/** Measurement payload shared by scan + animal profile. */
export const measuresSchema = z.object({
  weight: weightSchema,
  bcs: bcsSchema,
  notes: z.string().max(500).optional(),
});

/** New-animal registration payload. */
export const newAnimalSchema = z.object({
  rfid: z.string().trim().min(1, "RFID required").max(64),
  code: z.string().trim().min(1, "Code required").max(24),
  weight: weightSchema,
  bcs: bcsSchema,
});

/** Expert sign-off protocol (verification page). */
export const signoffSchema = z.object({
  name: z.string().trim().min(1, "Name required").max(80),
});

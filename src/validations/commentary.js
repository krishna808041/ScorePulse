// src/validations/commentary.js
import { z } from "zod";
import { MAX_COMMENTARY_LIMIT } from "../constants/commentary.js";

export const listCommentaryQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(MAX_COMMENTARY_LIMIT).optional(),
});

export const createCommentarySchema = z.object({
  minute: z.number().int().nonnegative(),
  sequence: z.number().int().optional(),
  period: z.string().optional(),
  eventType: z.string().optional(),
  actor: z.string().optional(),
  team: z.string().optional(),
  message: z.string().trim().min(1),
  metadata: z.object({}).catchall(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
});

export const matchIdParamsSchema = z.object({
    id : z.string().regex(/^[a-f\d]{24}$/i, "Invalid Id"),
}); 
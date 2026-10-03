import { z } from "zod";
import { MAX_TICKETS_PER_ORDER } from "@/modules/events";

export const checkoutSlugSchema = z.string().trim().min(1);

export const ticketQuantitySchema = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().min(1).max(MAX_TICKETS_PER_ORDER));

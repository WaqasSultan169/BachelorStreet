import { z } from "zod";
import { ORDER } from "@/lib/constants";
import { objectIdSchema } from "@/server/validation/common";

export const cartQuoteLineSchema = z.object({
  productId: objectIdSchema,
  optionKeys: z.array(z.string().min(1).max(80)).max(20).default([]),
  quantity: z.coerce.number().int().min(1).max(ORDER.maxLineQuantity),
  note: z
    .string()
    .trim()
    .max(ORDER.noteMaxLength, "Note is too long")
    .optional()
    .or(z.literal("")),
});

export const cartQuoteSchema = z.object({
  lines: z.array(cartQuoteLineSchema).max(50),
  promotionCode: z.string().trim().toUpperCase().max(32).optional(),
});

export type CartQuoteLineInput = z.infer<typeof cartQuoteLineSchema>;
export type CartQuoteInput = z.infer<typeof cartQuoteSchema>;

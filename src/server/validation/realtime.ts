import { z } from "zod";
import { ORDER_STATUSES } from "@/lib/constants";
import { coordinatesSchema } from "@/server/validation/location";
import { objectIdSchema } from "@/server/validation/common";

const trackingIdSchema = z.string().regex(/^[A-Za-z0-9_-]{22}$/);

export const socketTicketRequestSchema = z.object({
  trackingId: trackingIdSchema.optional(),
});

export const trackingIdParamsSchema = z.object({
  trackingId: trackingIdSchema,
});

export const staffOrderStatusSchema = z.object({
  orderId: objectIdSchema,
  status: z.enum(ORDER_STATUSES),
  note: z.string().trim().max(300).optional(),
});

export const assignDeliveryWorkerSchema = z.object({
  orderId: objectIdSchema,
  deliveryBoyId: objectIdSchema,
});

export const updateDeliveryLocationSchema = z.object({
  orderId: objectIdSchema,
  coordinates: coordinatesSchema,
});

export type StaffOrderStatusInput = z.infer<typeof staffOrderStatusSchema>;
export type AssignDeliveryWorkerInput = z.infer<
  typeof assignDeliveryWorkerSchema
>;
export type UpdateDeliveryLocationInput = z.infer<
  typeof updateDeliveryLocationSchema
>;

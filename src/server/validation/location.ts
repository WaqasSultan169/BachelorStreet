import { z } from "zod";
import { objectIdSchema } from "@/server/validation/common";

export const coordinatesSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
});

export const deliveryCheckSchema = z.object({
  coordinates: coordinatesSchema.optional(),
  area: z.string().trim().min(1).max(80).optional(),
  city: z.string().trim().min(1).max(80).optional(),
  branchId: objectIdSchema.optional(),
}).refine(
  (value) =>
    Boolean(value.coordinates || (value.area?.trim() && value.city?.trim())),
  {
    message: "Provide a map location or both a delivery area and city.",
  },
);

/** Address search built from query params in the geo route. */
export const geocodeQuerySchema = z.object({
  q: z.string().trim().min(3, "Please type at least 3 characters").max(120),
  proximity: coordinatesSchema.optional(),
});

/** Reverse geocoding built from query params (strings → coerced numbers). */
export const reverseGeocodeQuerySchema = z.object({
  lat: z.coerce.number().finite().min(-90).max(90),
  lng: z.coerce.number().finite().min(-180).max(180),
});

export type CoordinatesInput = z.infer<typeof coordinatesSchema>;
export type DeliveryCheckInput = z.infer<typeof deliveryCheckSchema>;
export type GeocodeQueryInput = z.infer<typeof geocodeQuerySchema>;
export type ReverseGeocodeQueryInput = z.infer<
  typeof reverseGeocodeQuerySchema
>;

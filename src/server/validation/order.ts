import { z } from "zod";
import { ORDER, PAYMENT_METHODS } from "@/lib/constants";
import { isValidPkPhone } from "@/lib/phone";
import { emailSchema } from "@/server/validation/auth";
import { objectIdSchema } from "@/server/validation/common";
import { coordinatesSchema } from "@/server/validation/location";
import { cartQuoteLineSchema } from "@/server/validation/cart";

/** Pakistani mobile number, accepted in local or international form. */
export const pkPhoneSchema = z
  .string()
  .trim()
  .min(7, "Phone number is required")
  .max(20, "Phone number is too long")
  .refine((value) => isValidPkPhone(value), {
    message: "Enter a valid Pakistani mobile number, e.g. 0300 1234567",
  });

export const orderContactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please enter your name")
    .max(80, "Name is too long"),
  email: emailSchema,
  phone: pkPhoneSchema,
});

export const orderAddressSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "A short address label is required")
    .max(80, "Address label is too long"),
  street: z.string().trim().max(160, "Street is too long").optional().or(z.literal("")),
  area: z.string().trim().max(80, "Area is too long").optional().or(z.literal("")),
  city: z.string().trim().max(80, "City is too long").optional().or(z.literal("")),
  instructions: z
    .string()
    .trim()
    .max(ORDER.instructionsMaxLength, "Delivery instructions are too long")
    .optional()
    .or(z.literal("")),
  /** A map pin is optional when the address area matches an active delivery zone. */
  coordinates: coordinatesSchema.optional(),
});

export const orderFulfillmentSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("pickup"),
    branchId: objectIdSchema,
  }),
  z.object({
    type: z.literal("delivery"),
    branchId: objectIdSchema.optional(),
    address: orderAddressSchema,
  }),
]).superRefine((fulfillment, context) => {
  if (
    fulfillment.type === "delivery" &&
    !fulfillment.address.coordinates &&
    (!fulfillment.address.area?.trim() || !fulfillment.address.city?.trim())
  ) {
    context.addIssue({
      code: "custom",
      path: ["address", "area"],
      message: "Enter a delivery area and city when you do not provide a map location.",
    });
  }
});

/** Full server-side checkout payload. Totals are NOT part of this - recomputed. */
export const placeOrderSchema = z.object({
  idempotencyKey: z
    .string()
    .trim()
    .min(8, "Invalid request key")
    .max(100, "Invalid request key"),
  contact: orderContactSchema,
  fulfillment: orderFulfillmentSchema,
  paymentMethod: z.enum(PAYMENT_METHODS),
  promotionCode: z.string().trim().toUpperCase().max(32).optional(),
  items: z
    .array(cartQuoteLineSchema)
    .min(1, "Your cart is empty")
    .max(ORDER.maxItems, "Too many items in one order"),
  customerNote: z
    .string()
    .trim()
    .max(ORDER.noteMaxLength, "Note is too long")
    .optional()
    .or(z.literal("")),
  acceptTerms: z.literal(true, {
    message: "Please accept the terms and privacy policy to place your order.",
  }),
});

/** Shape of the checkout form on the client (fulfillment comes from state). */
export const checkoutFormSchema = z.object({
  name: orderContactSchema.shape.name,
  email: emailSchema,
  phone: pkPhoneSchema,
  paymentMethod: z.enum(PAYMENT_METHODS),
  promotionCode: z.string().trim().toUpperCase().max(32).optional(),
  instructions: orderAddressSchema.shape.instructions,
  customerNote: placeOrderSchema.shape.customerNote,
  acceptTerms: z.boolean().refine((value) => value === true, {
    message: "Please accept the terms and privacy policy to place your order.",
  }),
});

export type PkPhoneInput = z.infer<typeof pkPhoneSchema>;
export type OrderContactInput = z.infer<typeof orderContactSchema>;
export type OrderAddressInput = z.infer<typeof orderAddressSchema>;
export type OrderFulfillmentInput = z.infer<typeof orderFulfillmentSchema>;
export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
export type CheckoutFormInput = z.infer<typeof checkoutFormSchema>;

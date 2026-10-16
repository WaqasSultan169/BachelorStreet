import { z } from "zod";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  isCommonPassword,
} from "@/lib/password-policy";

/** Reusable email field. */
export const emailSchema = z.email("Enter a valid email address");

/** Password policy: length + not-commonly-compromised. No composition rules. */
export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Use at most ${PASSWORD_MAX_LENGTH} characters`)
  .refine((value) => !isCommonPassword(value), {
    message: "This password is too common — choose something less guessable",
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(80, "Name must be under 80 characters"),
    email: emailSchema,
    password: newPasswordSchema,
    phone: z
      .string()
      .trim()
      .max(20, "Phone number is too long")
      .optional()
      .or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    const password = value.password.toLowerCase();
    const localPart = value.email.split("@")[0]?.toLowerCase();
    if (localPart && localPart.length >= 4 && password.includes(localPart)) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: "Avoid using your email address in your password",
      });
    }
    const name = value.name.trim().toLowerCase();
    if (name.length >= 4 && password.includes(name)) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: "Avoid using your name in your password",
      });
    }
  });

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Verification token is required").max(200),
});

export const resendVerificationSchema = z.object({
  email: emailSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required").max(200),
  password: newPasswordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: newPasswordSchema,
});

export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name must be under 80 characters"),
  phone: z
    .string()
    .trim()
    .max(20, "Phone number is too long")
    .optional()
    .or(z.literal("")),
});

export const addressSchema = z.object({
  label: z.string().trim().min(1, "Give this address a label").max(40),
  street: z.string().trim().max(120).optional().or(z.literal("")),
  area: z.string().trim().max(80).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  phone: z
    .string()
    .trim()
    .max(20, "Phone number is too long")
    .optional()
    .or(z.literal("")),
  instructions: z
    .string()
    .trim()
    .max(200, "Instructions are too long")
    .optional()
    .or(z.literal("")),
  isDefault: z.boolean().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type AddressInput = z.infer<typeof addressSchema>;

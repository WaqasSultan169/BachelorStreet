import { Schema, model, models, type Model, type Types } from "mongoose";
import { ROLES, type Role } from "@/lib/constants";

export interface UserAddress {
  _id?: Types.ObjectId;
  label: string;
  street?: string;
  area?: string;
  city?: string;
  phone?: string;
  instructions?: string;
  isDefault?: boolean;
}

export interface UserShape {
  _id: Types.ObjectId;
  /** Stored normalized (lowercase) — see normalizedEmail. */
  email: string;
  /** Lowercase, unique lookup key. */
  normalizedEmail: string;
  /** Optional for OAuth-only accounts. Never selected by default. */
  passwordHash?: string;
  name: string;
  phone?: string;
  image?: string;
  role: Role;
  addresses: UserAddress[];
  /** When the email was proven (credential verification or trusted OAuth). */
  emailVerified?: Date | null;
  /** OAuth providers this account is linked to, e.g. ["google"]. */
  oauthProviders: string[];
  /**
   * Incremented to invalidate existing sessions (e.g. after a password reset).
   * The JWT stores the value it was issued with and server guards compare it.
   */
  tokenVersion: number;
  isActive: boolean;
  emailNotificationConsent: boolean;
  phoneNotificationConsent: boolean;
  phoneNotificationConsentAt?: Date;
  /** True for records created by the development-only demo seeder. */
  isDemo: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserShape>(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    normalizedEmail: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
    },
    passwordHash: { type: String, select: false },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 80 },
    phone: { type: String, trim: true },
    image: { type: String },
    role: { type: String, enum: ROLES, default: "customer" },
    addresses: {
      type: [
        {
          label: { type: String, required: true, trim: true },
          street: String,
          area: String,
          city: String,
          phone: String,
          instructions: String,
          isDefault: { type: Boolean, default: false },
        },
      ],
      default: [],
    },
    isActive: { type: Boolean, default: true },
    emailNotificationConsent: { type: Boolean, default: false },
    phoneNotificationConsent: { type: Boolean, default: false },
    phoneNotificationConsentAt: { type: Date },
    isDemo: { type: Boolean, default: false },
    emailVerified: { type: Date, default: null },
    oauthProviders: { type: [String], default: [] },
    tokenVersion: { type: Number, default: 0 },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

userSchema.index({ email: 1 }, { unique: true });

export type UserModel = Model<UserShape>;

export function getUserModel(): UserModel {
  return (models.User as UserModel | undefined) ?? model<UserShape>("User", userSchema);
}
import { Schema, model, models, type Model, type Types } from "mongoose";

/** Purpose of a one-time auth token. */
export const AUTH_TOKEN_TYPES = ["email_verification", "password_reset"] as const;
export type AuthTokenType = (typeof AUTH_TOKEN_TYPES)[number];

export interface AuthTokenShape {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  type: AuthTokenType;
  /**
   * SHA-256 of the raw token. The raw value is only ever sent to the user;
   * a database leak therefore cannot be replayed to verify or reset.
   */
  tokenHash: string;
  expiresAt: Date;
  consumedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const authTokenSchema = new Schema<AuthTokenShape>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: AUTH_TOKEN_TYPES, required: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Mongo TTL: expired tokens are removed automatically.
authTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
authTokenSchema.index({ user: 1, type: 1 });

export type AuthTokenModel = Model<AuthTokenShape>;

export function getAuthTokenModel(): AuthTokenModel {
  return (
    (models.AuthToken as AuthTokenModel | undefined) ??
    model<AuthTokenShape>("AuthToken", authTokenSchema)
  );
}

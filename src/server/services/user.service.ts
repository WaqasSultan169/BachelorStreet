import "server-only";
import { Types } from "mongoose";
import { connectDb } from "@/server/db";
import { getUserModel, type UserAddress } from "@/server/db/models";
import { hashPassword } from "@/server/auth/password";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { BadRequestError } from "@/lib/errors";
import type { Role } from "@/lib/constants";
import { recordAuditEvent } from "@/server/services/audit.service";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type UserAddressDto = {
  id: string;
  label: string;
  street?: string;
  area?: string;
  city?: string;
  phone?: string;
  instructions?: string;
  isDefault: boolean;
};

export type PublicUserDto = {
  id: string;
  email: string;
  name: string;
  phone?: string;
  image?: string;
  role: Role;
  emailVerified: boolean;
  hasPassword: boolean;
  emailNotificationConsent: boolean;
  phoneNotificationConsent: boolean;
  oauthProviders: string[];
  addresses: UserAddressDto[];
  createdAt: string;
};

type UserDoc = {
  _id: { toString(): string };
  email: string;
  name: string;
  phone?: string | null;
  image?: string | null;
  role: Role;
  emailVerified?: Date | null;
  passwordHash?: string;
  oauthProviders?: string[];
  addresses?: (UserAddress & { _id?: Types.ObjectId })[];
  createdAt?: Date;
  emailNotificationConsent?: boolean;
  phoneNotificationConsent?: boolean;
};

function toAddressDto(address: UserAddress & { _id?: Types.ObjectId }): UserAddressDto {
  return {
    id: address._id?.toString() ?? "",
    label: address.label,
    street: address.street ?? undefined,
    area: address.area ?? undefined,
    city: address.city ?? undefined,
    phone: address.phone ?? undefined,
    instructions: address.instructions ?? undefined,
    isDefault: Boolean(address.isDefault),
  };
}

function toPublicUser(doc: UserDoc): PublicUserDto {
  return {
    id: doc._id.toString(),
    email: doc.email,
    name: doc.name,
    phone: doc.phone ?? undefined,
    image: doc.image ?? undefined,
    role: doc.role,
    emailVerified: Boolean(doc.emailVerified),
    hasPassword: Boolean(doc.passwordHash),
    emailNotificationConsent: Boolean(doc.emailNotificationConsent),
    phoneNotificationConsent: Boolean(doc.phoneNotificationConsent),
    oauthProviders: doc.oauthProviders ?? [],
    addresses: (doc.addresses ?? []).map(toAddressDto),
    createdAt: doc.createdAt?.toISOString() ?? "",
  };
}

export async function findUserById(id: string): Promise<PublicUserDto | null> {
  await connectDb();
  const User = getUserModel();
  const doc = await User.findById(id)
    .select("+passwordHash")
    .lean<UserDoc>();
  return doc ? toPublicUser(doc) : null;
}

export async function findUserByEmail(email: string): Promise<PublicUserDto | null> {
  await connectDb();
  const User = getUserModel();
  const doc = await User.findOne({ normalizedEmail: normalizeEmail(email) })
    .select("+passwordHash")
    .lean<UserDoc>();
  return doc ? toPublicUser(doc) : null;
}

export async function isEmailTaken(email: string): Promise<boolean> {
  await connectDb();
  const User = getUserModel();
  const existing = await User.exists({ normalizedEmail: normalizeEmail(email) });
  return Boolean(existing);
}

export type CreateCredentialUserInput = {
  name: string;
  email: string;
  password: string;
  phone?: string;
};

/**
 * Create a self-service (customer) account. The role is never caller-supplied
 * here, so public signup can never grant a privileged role.
 */
export async function createCredentialUser(
  input: CreateCredentialUserInput,
): Promise<PublicUserDto> {
  const email = normalizeEmail(input.email);
  await connectDb();
  const User = getUserModel();

  if (await isEmailTaken(email)) {
    throw new ConflictError("An account with this email already exists");
  }

  const passwordHash = await hashPassword(input.password);
  const created = await User.create({
    email,
    normalizedEmail: email,
    passwordHash,
    name: input.name.trim(),
    phone: input.phone?.trim() || undefined,
    role: "customer",
    emailVerified: null,
    oauthProviders: [],
  });

  return toPublicUser(created.toObject() as UserDoc);
}

export async function updateUserProfile(
  userId: string,
  input: { name?: string; phone?: string },
): Promise<PublicUserDto> {
  await connectDb();
  const User = getUserModel();
  const update: Record<string, unknown> = {};
  if (input.name !== undefined) update.name = input.name.trim();
  if (input.phone !== undefined) update.phone = input.phone.trim() || undefined;

  const doc = await User.findByIdAndUpdate(userId, { $set: update }, { new: true })
    .select("+passwordHash")
    .lean<UserDoc>();
  if (!doc) throw new NotFoundError("Account not found");
  return toPublicUser(doc);
}

export async function addUserAddress(
  userId: string,
  address: UserAddress,
): Promise<PublicUserDto> {
  await connectDb();
  const User = getUserModel();
  const doc = await User.findById(userId);
  if (!doc) throw new NotFoundError("Account not found");

  if (address.isDefault || doc.addresses.length === 0) {
    doc.addresses.forEach((entry) => {
      entry.isDefault = false;
    });
    address.isDefault = true;
  }
  doc.addresses.push(address);
  await doc.save();
  return toPublicUser(doc.toObject() as UserDoc);
}

export async function updateUserAddress(
  userId: string,
  addressId: string,
  address: Partial<UserAddress>,
): Promise<PublicUserDto> {
  await connectDb();
  const User = getUserModel();
  const doc = await User.findById(userId);
  if (!doc) throw new NotFoundError("Account not found");

  const target = doc.addresses.find(
    (entry) => entry._id?.toString() === addressId,
  );
  if (!target) throw new NotFoundError("Address not found");

  if (address.label !== undefined) target.label = address.label;
  if (address.street !== undefined) target.street = address.street;
  if (address.area !== undefined) target.area = address.area;
  if (address.city !== undefined) target.city = address.city;
  if (address.phone !== undefined) target.phone = address.phone;
  if (address.instructions !== undefined) target.instructions = address.instructions;

  if (address.isDefault) {
    for (const entry of doc.addresses) entry.isDefault = false;
    target.isDefault = true;
  }

  await doc.save();
  return toPublicUser(doc.toObject() as UserDoc);
}

export async function removeUserAddress(
  userId: string,
  addressId: string,
): Promise<PublicUserDto> {
  await connectDb();
  const User = getUserModel();
  const doc = await User.findByIdAndUpdate(
    userId,
    { $pull: { addresses: { _id: new Types.ObjectId(addressId) } } },
    { new: true },
  )
    .select("+passwordHash")
    .lean<UserDoc>();
  if (!doc) throw new NotFoundError("Account not found");
  return toPublicUser(doc);
}

/**
 * Administrative role change. The caller MUST have already passed an
 * admin authorization check (requireRole("admin")) — this function only
 * performs the write and does not authorize.
 */
export async function setUserRole(
  actorId: string,
  userId: string,
  role: Role,
): Promise<void> {
  if (actorId === userId && role !== "admin") {
    throw new ConflictError("You cannot demote your own administrator account.");
  }
  await connectDb();
  const User = getUserModel();
  const before = await User.findById(userId).select("role").lean<{ role: Role } | null>();
  if (!before) throw new NotFoundError("Account not found");
  const result = await User.updateOne(
    { _id: userId },
    { $set: { role }, $inc: { tokenVersion: 1 } },
  );
  if (result.matchedCount === 0) throw new NotFoundError("Account not found");
  await recordAuditEvent({
    actorId,
    action: "user.role_changed",
    targetType: "user",
    targetId: userId,
    metadata: { from: before.role, to: role },
  });
}

export async function updateUserNotificationPreferences(
  userId: string,
  input: { email: boolean; phone: boolean },
): Promise<void> {
  await connectDb();
  const User = getUserModel();
  const user = await User.findById(userId).select("phone").lean<{ phone?: string } | null>();
  if (!user) throw new NotFoundError("Account not found");
  if (input.phone && !user.phone) {
    throw new BadRequestError("Add a phone number to your profile before enabling phone notifications.");
  }
  await User.updateOne(
    { _id: userId },
    {
      $set: {
        emailNotificationConsent: input.email,
        phoneNotificationConsent: input.phone,
        phoneNotificationConsentAt: input.phone ? new Date() : null,
      },
    },
  );
  await recordAuditEvent({
    actorId: userId,
    action: "user.notification_consent_changed",
    targetType: "user",
    targetId: userId,
    metadata: { email: input.email, phone: input.phone },
  });
}

/**
 * Test-only helper: create or delete a temporary admin account.
 *
 * Used by `tests/hero.spec.ts` to exercise the authenticated hero-upload
 * endpoint end to end. It refuses to run in production and never touches
 * anything except the single account it creates.
 *
 * Usage (the caller must load .env.local first, e.g. with
 * `node --env-file-if-exists=.env.local`):
 *   node tests/helpers/test-admin.mjs create          -> { id, email, password }
 *   node tests/helpers/test-admin.mjs delete <userId>  -> { deleted }
 */
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { hash } from "@node-rs/argon2";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to manage test accounts in production.");
  process.exit(1);
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is required (load .env.local).");
  process.exit(2);
}

const mode = process.argv[2] ?? "create";

await mongoose.connect(uri, { autoIndex: false, serverSelectionTimeoutMS: 15_000 });
const users = mongoose.connection.collection("users");

try {
  if (mode === "create") {
    const id = new mongoose.Types.ObjectId();
    const email = `hero-upload-test-${randomUUID().slice(0, 8)}@example.com`;
    const password = `Test-${randomUUID()}`;
    const passwordHash = await hash(password, {
      algorithm: 2, // Argon2id — matches src/server/auth/password.ts
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
      outputLen: 32,
    });
    const now = new Date();
    await users.insertOne({
      _id: id,
      email,
      normalizedEmail: email.toLowerCase(),
      passwordHash,
      name: "Hero Upload Test",
      role: "admin",
      addresses: [],
      oauthProviders: [],
      tokenVersion: 0,
      isActive: true,
      emailVerified: now,
      emailNotificationConsent: false,
      phoneNotificationConsent: false,
      isDemo: true,
      createdAt: now,
      updatedAt: now,
    });
    console.log(JSON.stringify({ id: id.toString(), email, password }));
  } else if (mode === "delete") {
    const id = process.argv[3];
    if (!id) {
      console.error("delete requires a user id.");
      process.exit(2);
    }
    const result = await users.deleteOne({ _id: new mongoose.Types.ObjectId(id) });
    console.log(JSON.stringify({ deleted: result.deletedCount }));
  } else {
    console.error(`Unknown mode: ${mode}`);
    process.exit(2);
  }
} finally {
  await mongoose.disconnect();
}

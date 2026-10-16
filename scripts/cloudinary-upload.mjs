/**
 * Bachelor Street Café — Cloudinary image upload
 * ---------------------------------------------------------------------------
 * Uploads the photos referenced by `scripts/seed-images.json` into Cloudinary
 * using a dependency-free signed upload (Node's fetch + FormData).
 *
 * Usage:
 *   npm run images:upload
 *   node --env-file=.env.local scripts/cloudinary-upload.mjs
 *   node --env-file=.env.local scripts/cloudinary-upload.mjs --update-db
 *
 * Required env (.env.local):
 *   CLOUDINARY_CLOUD_NAME      (or NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME)
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 *
 * What it does:
 *   1. Reads scripts/seed-images.json.
 *   2. Uploads each `source` (a remote URL or a local path) to Cloudinary at
 *      `<publicIdPrefix>/<slug>`, overwriting the previous copy.
 *   3. Writes scripts/seed-images.generated.json, consumed by `npm run seed`.
 *   4. With --update-db, also points existing products at the new URLs.
 */
import mongoose from "mongoose";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { basename, dirname, extname, join, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const CLOUDINARY_CLOUD_NAME =
  process.env.CLOUDINARY_CLOUD_NAME?.trim() ||
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() ||
  "";
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY?.trim();
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET?.trim();

function ensureConfig() {
  const missing = [];
  if (!CLOUDINARY_CLOUD_NAME) {
    missing.push("CLOUDINARY_CLOUD_NAME or NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME");
  }
  if (!CLOUDINARY_API_KEY) missing.push("CLOUDINARY_API_KEY");
  if (!CLOUDINARY_API_SECRET) missing.push("CLOUDINARY_API_SECRET");
  if (missing.length > 0) {
    console.error("Missing Cloudinary env:");
    for (const item of missing) console.error(`  - ${item}`);
    console.error(
      "\nAdd them to .env.local, then re-run. Find them at https://console.cloudinary.com/",
    );
    process.exit(1);
  }
}

function readManifest() {
  const path = join(__dirname, "seed-images.json");
  if (!existsSync(path)) {
    console.error(`No manifest found at ${path}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

/**
 * Cloudinary accepts a remote URL directly, or a local file sent as a Blob.
 * Returns either a string (remote) or { blob, filename } for local files.
 */
function toUploadFile(source) {
  if (/^https?:\/\//i.test(source) || source.startsWith("data:")) return source;
  const absolute = isAbsolute(source) ? source : join(process.cwd(), source);
  const bytes = readFileSync(absolute);
  const name = basename(absolute);
  const ext = extname(absolute).toLowerCase();
  const type =
    ext === ".png"
      ? "image/png"
      : ext === ".webp"
        ? "image/webp"
        : ext === ".avif"
          ? "image/avif"
          : "image/jpeg";
  return { blob: new Blob([bytes], { type }), name };
}

async function uploadOne({ publicId, source }) {
  const timestamp = Math.floor(Date.now() / 1000);
  const params = {
    public_id: publicId,
    timestamp,
    overwrite: "true",
    invalidate: "true",
  };
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  const signature = createHash("sha1")
    .update(`${toSign}${CLOUDINARY_API_SECRET}`)
    .digest("hex");

  const form = new FormData();
  const file = toUploadFile(source);
  if (typeof file === "string") {
    form.append("file", file);
  } else {
    form.append("file", file.blob, file.name);
  }
  for (const [key, value] of Object.entries(params)) {
    form.append(key, String(value));
  }
  form.append("api_key", CLOUDINARY_API_KEY);
  form.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: form },
  );
  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    const reason = json?.error?.message ?? JSON.stringify(json);
    throw new Error(`${response.status}: ${reason}`);
  }

  return { url: json.secure_url, width: json.width, height: json.height };
}

async function updateDatabase(generated) {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.warn("\nSkipped --update-db: MONGODB_URI is not set.");
    return;
  }
  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  const collection = mongoose.connection.collection("products");
  let updated = 0;
  for (const [slug, url] of Object.entries(generated)) {
    const result = await collection.updateOne(
      { slug },
      { $set: { images: [url], updatedAt: new Date() } },
    );
    if (result.matchedCount > 0) updated += 1;
  }
  await mongoose.disconnect();
  console.log(`\nDatabase: updated images on ${updated} product(s).`);
}

async function main() {
  ensureConfig();

  const manifest = readManifest();
  const prefix = (manifest.publicIdPrefix ?? "bachelor-street").replace(/\/+$/, "");
  const entries = Object.entries(manifest.images ?? {});

  if (entries.length === 0) {
    console.error("No images in the manifest.");
    process.exit(1);
  }

  console.log(`Cloudinary cloud: ${CLOUDINARY_CLOUD_NAME}`);
  console.log(`Uploading ${entries.length} image(s)…\n`);

  const generated = {};
  const failures = [];

  for (const [slug, entry] of entries) {
    const source = entry?.source;
    if (!source) {
      failures.push(`${slug}: no source`);
      continue;
    }
    try {
      const result = await uploadOne({ slug, publicId: `${prefix}/${slug}`, source });
      generated[slug] = result.url;
      console.log(`  OK  ${slug.padEnd(24)} ${result.width}x${result.height}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${slug}: ${message}`);
      console.log(`  ERR ${slug.padEnd(24)} ${message}`);
    }
  }

  const outputPath = join(__dirname, "seed-images.generated.json");
  const payload = {
    $comment:
      "Generated by scripts/cloudinary-upload.mjs. Maps product slug to the uploaded Cloudinary URL.",
    cloudName: CLOUDINARY_CLOUD_NAME,
    generatedAt: new Date().toISOString(),
    images: generated,
  };
  writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);

  console.log(
    `\nWrote scripts/seed-images.generated.json (${Object.keys(generated).length} image(s)).`,
  );
  if (failures.length > 0) {
    console.warn(`\n${failures.length} failure(s):`);
    for (const failure of failures) console.warn(`  - ${failure}`);
  }

  if (process.argv.includes("--update-db")) {
    await updateDatabase(generated);
  }

  console.log("\nNext:  npm run seed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

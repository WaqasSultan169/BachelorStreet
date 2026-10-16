import "server-only";
import type { Types } from "mongoose";
import { connectDb } from "@/server/db";
import { getBranchModel, getDeliveryZoneModel, getStoreSettingsModel } from "@/server/db/models";
import { env } from "@/lib/env";
import { APP, DELIVERY } from "@/lib/constants";
import {
  buildMapsDirectionsUrl,
  distanceKm,
  formatDistanceKm,
} from "@/lib/geo";
import type {
  BranchDto,
  Coordinates,
  CoverageResult,
} from "@/lib/types/location";

type LeanBranch = {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  address: string;
  phone?: string | null;
  city: string;
  hours?: { day: string; open?: string | null; close?: string | null; closed?: boolean | null }[] | null;
  coordinates?: { lat?: number | null; lng?: number | null } | null;
  deliveryAvailable: boolean;
  pickupAvailable: boolean;
};

const TIME_ZONE = "Asia/Karachi";

function branchCoordinates(branch: LeanBranch): Coordinates | undefined {
  if (branch.slug === APP.primaryBranch.slug) {
    return APP.primaryBranch.coordinates;
  }
  const lat = branch.coordinates?.lat;
  const lng = branch.coordinates?.lng;
  if (typeof lat === "number" && typeof lng === "number") return { lat, lng };
  return undefined;
}

function computeOpenState(
  hours: LeanBranch["hours"],
  now: Date,
): { isOpenNow: boolean | null; todayHours?: string } {
  if (!hours || hours.length === 0) return { isOpenNow: null };

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "";
  const rawHour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  const hour = rawHour === "24" ? "00" : rawHour;
  const localTime = `${hour}:${minute}`;

  const today = hours.find(
    (entry) => entry.day?.toLowerCase() === weekday.toLowerCase(),
  );
  if (!today) return { isOpenNow: null };
  if (today.closed || !today.open || !today.close) {
    return { isOpenNow: false, todayHours: "Closed today" };
  }

  const isOpenNow = localTime >= today.open && localTime <= today.close;
  return { isOpenNow, todayHours: `${today.open}–${today.close}` };
}

function toBranchDto(branch: LeanBranch, now: Date): BranchDto {
  const coordinates = branchCoordinates(branch);
  const { isOpenNow, todayHours } = computeOpenState(branch.hours, now);
  const primaryBranch = branch.slug === APP.primaryBranch.slug;
  return {
    id: branch._id.toString(),
    name: primaryBranch ? APP.primaryBranch.name : branch.name,
    slug: branch.slug,
    address: primaryBranch ? APP.primaryBranch.address : branch.address,
    phone: primaryBranch ? undefined : branch.phone ?? undefined,
    city: branch.city,
    coordinates,
    hours: (branch.hours ?? []).map((entry) => ({
      day: entry.day,
      open: entry.open ?? undefined,
      close: entry.close ?? undefined,
      closed: Boolean(entry.closed),
    })),
    isOpenNow,
    todayHours,
    mapsUrl: coordinates ? buildMapsDirectionsUrl(coordinates) : undefined,
    deliveryAvailable: branch.deliveryAvailable,
    pickupAvailable: branch.pickupAvailable,
  };
}

/** Active branches, orderable by the customer. */
export async function listBranches(): Promise<BranchDto[]> {
  await connectDb();
  const Branch = getBranchModel();
  const branches = await Branch.find({
    isActive: true,
    slug: APP.primaryBranch.slug,
  })
    .sort({ name: 1 })
    .lean<LeanBranch[]>();
  const now = new Date();
  return branches.map((branch) => toBranchDto(branch, now));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Authoritative delivery-coverage check. Distances are computed with the
 * haversine formula against either the configured delivery origin or each
 * branch's coordinates; the 5 km radius is applied server-side only.
 *
 * Called by POST /api/delivery/check and — from Phase 4 — when an order is
 * created, so the client can never widen its own delivery area.
 */
export async function checkCoverage(
  coordinates: Coordinates,
  branchId?: string,
): Promise<CoverageResult> {
  await connectDb();
  const settings = await getStoreSettingsModel().findOne({ key: "store" })
    .select("deliveryRadiusKm deliveryEnabled")
    .lean<{ deliveryRadiusKm?: number; deliveryEnabled?: boolean } | null>();
  const radiusKm = settings?.deliveryRadiusKm ?? env.DELIVERY_RADIUS_KM ?? DELIVERY.defaultRadiusKm;
  if (settings?.deliveryEnabled === false) {
    return {
      status: "unavailable",
      deliverable: false,
      distanceKm: null,
      radiusKm,
      message: "Delivery is temporarily unavailable.",
    };
  }
  const Branch = getBranchModel();

  const branches = await Branch.find({
    isActive: true,
    deliveryAvailable: true,
    slug: APP.primaryBranch.slug,
    ...(branchId ? { _id: branchId } : {}),
  }).lean<LeanBranch[]>();

  if (branches.length === 0) {
    return {
      status: "unavailable",
      deliverable: false,
      distanceKm: null,
      radiusKm,
      message: "Delivery is not available from this branch right now.",
    };
  }

  const fixedOrigin = APP.primaryBranch.coordinates;

  let best: { branch: LeanBranch; origin: Coordinates; distance: number } | null =
    null;

  for (const branch of branches) {
    const origin = fixedOrigin ?? branchCoordinates(branch);
    if (!origin) continue;
    const distance = distanceKm(coordinates, origin);
    if (!best || distance < best.distance) {
      best = { branch, origin, distance };
    }
  }

  if (!best) {
    return {
      status: "unavailable",
      deliverable: false,
      distanceKm: null,
      radiusKm,
      message: "Delivery coordinates are not configured for our branches yet.",
    };
  }

  const branchName =
    best.branch.slug === APP.primaryBranch.slug
      ? APP.primaryBranch.name
      : best.branch.name;

  if (best.distance > radiusKm) {
    return {
      status: "out-of-zone",
      deliverable: false,
      distanceKm: round2(best.distance),
      radiusKm,
      origin: best.origin,
      branchId: best.branch._id.toString(),
      branchName,
      message: `That address is ${formatDistanceKm(
        best.distance,
      )} from our delivery origin — outside the ${radiusKm} km delivery zone.`,
    };
  }

  const zone = await getDeliveryZoneModel()
    .findOne({ branch: best.branch._id, isActive: true })
    .sort({ deliveryFee: 1 })
    .lean<{
      name?: string;
      deliveryFee?: number;
      freeAbove?: number | null;
      minOrder?: number | null;
      etaMinutes?: number;
    } | null>();

  return {
    status: "deliverable",
    deliverable: true,
    distanceKm: round2(best.distance),
    radiusKm,
    origin: best.origin,
    branchId: best.branch._id.toString(),
    branchName,
    zoneName: zone?.name,
    deliveryFee: zone?.deliveryFee,
    freeAbove: zone?.freeAbove ?? undefined,
    minOrder: zone?.minOrder ?? undefined,
    etaMinutes: zone?.etaMinutes,
    message: zone?.etaMinutes
      ? `Within our delivery zone — about ${zone.etaMinutes} minutes from ${branchName}.`
      : "This address is within our delivery zone.",
  };
}

/**
 * An area label alone cannot establish distance from the delivery origin.
 * Require server-verified coordinates before confirming serviceability.
 */
export async function checkCoverageByArea(): Promise<CoverageResult> {
  await connectDb();
  const settings = await getStoreSettingsModel().findOne({ key: "store" })
    .select("deliveryRadiusKm deliveryEnabled")
    .lean<{ deliveryRadiusKm?: number; deliveryEnabled?: boolean } | null>();
  const radiusKm = settings?.deliveryRadiusKm ?? env.DELIVERY_RADIUS_KM ?? DELIVERY.defaultRadiusKm;
  if (settings?.deliveryEnabled === false) {
    return {
      status: "unavailable",
      deliverable: false,
      distanceKm: null,
      radiusKm,
      message: "Delivery is temporarily unavailable.",
    };
  }
  return {
    status: "out-of-zone",
    deliverable: false,
    distanceKm: null,
    radiusKm,
    message:
      "Select an address search result or use your current location so we can verify it is within the delivery radius.",
  };
}

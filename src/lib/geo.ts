import type { Coordinates } from "@/lib/types/location";

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Great-circle (haversine) distance between two coordinates, in kilometres.
 * Reliable and dependency-free: accurate to well under 1% for the short
 * distances used for delivery-radius checks.
 */
export function distanceKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isValidCoordinates(value: unknown): value is Coordinates {
  if (!value || typeof value !== "object") return false;
  const { lat, lng } = value as { lat?: unknown; lng?: unknown };
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function formatDistanceKm(distanceKm: number): string {
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  return `${distanceKm.toFixed(1)} km`;
}

/** Real, functional Google Maps directions link (no API key required). */
export function buildMapsDirectionsUrl(coordinates: Coordinates): string {
  const destination = `${coordinates.lat},${coordinates.lng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

/**
 * Finds the nearest item that exposes coordinates. Returns null when no item
 * has usable coordinates. Pure function — used on both client and server.
 */
export function findNearest<T>(
  items: readonly T[],
  target: Coordinates,
  getCoordinates: (item: T) => Coordinates | undefined,
): { item: T; distanceKm: number } | null {
  let best: { item: T; distanceKm: number } | null = null;
  for (const item of items) {
    const coordinates = getCoordinates(item);
    if (!isValidCoordinates(coordinates)) continue;
    const distance = distanceKm(target, coordinates);
    if (!best || distance < best.distanceKm) {
      best = { item, distanceKm: distance };
    }
  }
  return best;
}

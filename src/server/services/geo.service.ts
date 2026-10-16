import "server-only";
import { env } from "@/lib/env";
import { distanceKm } from "@/lib/geo";
import { logger } from "@/lib/logger";
import type {
  Coordinates,
  GeoResult,
  GeoSearchResponse,
  GeoSource,
} from "@/lib/types/location";

/**
 * Server-side geocoding.
 *
 * When GEOCODING_PROVIDER + GEOCODING_API_KEY are configured we call the real
 * provider from the server (the key is never shipped to the browser). When they
 * are not, we fall back to a small, clearly-labelled SAMPLE lookup so the demo
 * remains usable — it is approximate and MUST NOT be presented as production
 * geocoding.
 */

const PROVIDER_TIMEOUT_MS = 6000;
const DEMO_REVERSE_RADIUS_KM = 20;

type DemoPlace = {
  id: string;
  name: string;
  area: string;
  city: string;
  lat: number;
  lng: number;
};

// Approximate centroids for the demo area. Labelled as sample data.
const DEMO_PLACES: DemoPlace[] = [
  { id: "demo-h13", name: "H-13 Markaz", area: "H-13", city: "Islamabad", lat: 33.6205, lng: 72.9285 },
  { id: "demo-f7", name: "F-7 Markaz", area: "F-7", city: "Islamabad", lat: 33.7205, lng: 73.0502 },
  { id: "demo-f6", name: "F-6 Markaz", area: "F-6", city: "Islamabad", lat: 33.7233, lng: 73.0681 },
  { id: "demo-f8", name: "F-8 Markaz", area: "F-8", city: "Islamabad", lat: 33.7128, lng: 73.04 },
  { id: "demo-g9", name: "G-9 Markaz", area: "G-9", city: "Islamabad", lat: 33.6939, lng: 73.03 },
  { id: "demo-g10", name: "G-10 Markaz", area: "G-10", city: "Islamabad", lat: 33.6917, lng: 73.0106 },
  { id: "demo-g11", name: "G-11 Markaz", area: "G-11", city: "Islamabad", lat: 33.6742, lng: 72.995 },
  { id: "demo-bluearea", name: "Blue Area", area: "Blue Area", city: "Islamabad", lat: 33.715, lng: 73.07 },
  { id: "demo-bahria", name: "Bahria Town Phase 4", area: "Phase 4", city: "Rawalpindi", lat: 33.5251, lng: 73.0893 },
  { id: "demo-dha2", name: "DHA Phase 2", area: "DHA Phase 2", city: "Islamabad", lat: 33.53, lng: 73.16 },
  { id: "demo-saddar", name: "Saddar", area: "Saddar", city: "Rawalpindi", lat: 33.596, lng: 73.052 },
];

function demoPlaceToResult(place: DemoPlace, coordinates?: Coordinates): GeoResult {
  return {
    id: place.id,
    name: place.name,
    address: `${place.area}, ${place.city}`,
    coordinates: coordinates ?? { lat: place.lat, lng: place.lng },
    source: "demo",
  };
}

function demoSearch(query: string, proximity?: Coordinates): GeoResult[] {
  const needle = query.trim().toLowerCase();
  const matches = DEMO_PLACES.filter((place) =>
    `${place.name} ${place.area} ${place.city}`.toLowerCase().includes(needle),
  );

  const ordered = proximity
    ? [...matches].sort(
        (a, b) => distanceKm(proximity, a) - distanceKm(proximity, b),
      )
    : matches;

  return ordered.slice(0, 6).map((place) => demoPlaceToResult(place));
}

function demoReverse(coordinates: Coordinates): GeoResult | null {
  let nearest: { place: DemoPlace; distance: number } | null = null;
  for (const place of DEMO_PLACES) {
    const distance = distanceKm(coordinates, place);
    if (!nearest || distance < nearest.distance) {
      nearest = { place, distance };
    }
  }
  if (!nearest || nearest.distance > DEMO_REVERSE_RADIUS_KM) return null;
  return {
    id: nearest.place.id,
    name: `Near ${nearest.place.name}`,
    address: `${nearest.place.area}, ${nearest.place.city} (approximate)`,
    coordinates,
    source: "demo",
  };
}

type MapboxFeatureCollection = {
  features?: {
    id: string;
    text: string;
    place_name: string;
    center: [number, number];
  }[];
};

function mapboxResults(data: MapboxFeatureCollection): GeoResult[] {
  return (data.features ?? []).map((feature) => ({
    id: feature.id,
    name: feature.text,
    address: feature.place_name,
    coordinates: { lat: feature.center[1], lng: feature.center[0] },
    source: "provider" as const,
  }));
}

async function mapboxPlaces(
  path: string,
  key: string,
  extra?: Record<string, string>,
): Promise<MapboxFeatureCollection> {
  const params = new URLSearchParams({
    access_token: key,
    limit: "6",
    language: "en",
    ...extra,
  });
  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${path}.json?${params.toString()}`,
    { signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS) },
  );
  if (!response.ok) throw new Error(`Mapbox ${response.status}`);
  return (await response.json()) as MapboxFeatureCollection;
}

async function mapboxSearch(
  query: string,
  key: string,
  proximity?: Coordinates,
): Promise<GeoResult[]> {
  const extra: Record<string, string> = { country: "pk" };
  if (proximity) extra.proximity = `${proximity.lng},${proximity.lat}`;
  const data = await mapboxPlaces(encodeURIComponent(query), key, extra);
  return mapboxResults(data);
}

async function mapboxReverse(
  coordinates: Coordinates,
  key: string,
): Promise<GeoResult | null> {
  const data = await mapboxPlaces(
    `${coordinates.lng},${coordinates.lat}`,
    key,
    { limit: "1" },
  );
  return mapboxResults(data)[0] ?? null;
}

type GoogleGeocodeResponse = {
  status: string;
  results?: {
    place_id: string;
    formatted_address: string;
    geometry: { location: { lat: number; lng: number } };
  }[];
};

async function googleGeocode(
  params: URLSearchParams,
  key: string,
): Promise<GoogleGeocodeResponse> {
  params.set("key", key);
  params.set("region", "pk");
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
    { signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS) },
  );
  if (!response.ok) throw new Error(`Google ${response.status}`);
  const data = (await response.json()) as GoogleGeocodeResponse;
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Google status ${data.status}`);
  }
  return data;
}

function googleResults(data: GoogleGeocodeResponse): GeoResult[] {
  return (data.results ?? []).slice(0, 6).map((result) => ({
    id: result.place_id,
    name: result.formatted_address.split(",")[0] ?? result.formatted_address,
    address: result.formatted_address,
    coordinates: {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
    },
    source: "provider" as const,
  }));
}

async function googleSearch(query: string, key: string): Promise<GeoResult[]> {
  const data = await googleGeocode(
    new URLSearchParams({ address: query, components: "country:PK" }),
    key,
  );
  return googleResults(data);
}

async function googleReverse(
  coordinates: Coordinates,
  key: string,
): Promise<GeoResult | null> {
  const data = await googleGeocode(
    new URLSearchParams({ latlng: `${coordinates.lat},${coordinates.lng}` }),
    key,
  );
  const result = googleResults(data)[0];
  if (!result) return null;
  return { ...result, coordinates };
}

function providerConfigured(): boolean {
  return env.GEOCODING_PROVIDER !== "demo" && Boolean(env.GEOCODING_API_KEY);
}

export async function searchAddresses(
  query: string,
  proximity?: Coordinates,
): Promise<GeoSearchResponse> {
  if (providerConfigured()) {
    const key = env.GEOCODING_API_KEY as string;
    try {
      const results =
        env.GEOCODING_PROVIDER === "mapbox"
          ? await mapboxSearch(query, key, proximity)
          : await googleSearch(query, key);
      if (results.length > 0) return { results, source: "provider" };
    } catch (error) {
      logger.warn("Geocoding search failed; using demo fallback", error);
    }
  }
  return { results: demoSearch(query, proximity), source: "demo" };
}

export async function reverseGeocode(coordinates: Coordinates): Promise<{
  result: GeoResult | null;
  source: GeoSource;
}> {
  if (providerConfigured()) {
    const key = env.GEOCODING_API_KEY as string;
    try {
      const result =
        env.GEOCODING_PROVIDER === "mapbox"
          ? await mapboxReverse(coordinates, key)
          : await googleReverse(coordinates, key);
      if (result) return { result, source: "provider" };
    } catch (error) {
      logger.warn("Reverse geocoding failed; using demo fallback", error);
    }
  }
  return { result: demoReverse(coordinates), source: "demo" };
}

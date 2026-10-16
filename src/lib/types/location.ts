import type { OrderType } from "@/lib/constants";

/** A WGS84 coordinate pair. Validated on the server before any distance math. */
export type Coordinates = { lat: number; lng: number };

export type BranchHoursDto = {
  day: string;
  open?: string;
  close?: string;
  closed: boolean;
};

/**
 * Public branch shape. This is a serialisable DTO shared by the client and the
 * server; it never carries internal Mongo fields.
 */
export type BranchDto = {
  id: string;
  name: string;
  slug: string;
  address: string;
  phone?: string;
  city: string;
  coordinates?: Coordinates;
  hours: BranchHoursDto[];
  /** Null when the branch has no opening hours configured for today. */
  isOpenNow: boolean | null;
  todayHours?: string;
  /** Real Google Maps directions link (opens the maps app / site). */
  mapsUrl?: string;
  deliveryAvailable: boolean;
  pickupAvailable: boolean;
};

/** A saved delivery address with an optional map pin. */
export type DeliveryAddress = {
  label: string;
  street?: string;
  area?: string;
  city?: string;
  phone?: string;
  instructions?: string;
  coordinates?: Coordinates;
};

export type GeoSource = "provider" | "demo";

export type GeoResult = {
  id: string;
  /** Short primary line, e.g. the place name. */
  name: string;
  /** Full formatted address. */
  address: string;
  coordinates: Coordinates;
  source: GeoSource;
};

export type GeoSearchResponse = {
  results: GeoResult[];
  source: GeoSource;
};

export type CoverageStatus = "deliverable" | "out-of-zone" | "unavailable";

/** Result of the server's delivery-coverage check. Never trusted from client. */
export type CoverageResult = {
  status: CoverageStatus;
  deliverable: boolean;
  /** Straight-line distance from the delivery origin, in km. */
  distanceKm: number | null;
  radiusKm: number;
  origin?: Coordinates;
  branchId?: string;
  branchName?: string;
  zoneName?: string;
  deliveryFee?: number;
  freeAbove?: number;
  minOrder?: number;
  etaMinutes?: number;
  /** Human-readable explanation, safe to display. */
  message: string;
};

export type FulfillmentSummary = {
  type: OrderType;
  branch: BranchDto | null;
  address: DeliveryAddress | null;
  coverage: CoverageResult | null;
};

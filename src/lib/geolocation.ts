"use client";

import type { Coordinates } from "@/lib/types/location";

export type GeolocationFailureCode =
  | "unsupported"
  | "denied"
  | "unavailable"
  | "timeout";

export class GeolocationFailure extends Error {
  readonly code: GeolocationFailureCode;

  constructor(code: GeolocationFailureCode, message: string) {
    super(message);
    this.name = "GeolocationFailure";
    this.code = code;
  }
}

/**
 * Requests the browser's location. Only ever called from a user gesture
 * (a button click) so the permission prompt is user-initiated. Resolves with
 * WGS84 coordinates or rejects with a typed failure the UI can explain.
 */
export function requestCoordinates(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      reject(
        new GeolocationFailure(
          "unsupported",
          "This device does not support location access. Please search for your address instead.",
        ),
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(
            new GeolocationFailure(
              "denied",
              "Location permission was denied. You can still search for your address or pick a branch.",
            ),
          );
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          reject(
            new GeolocationFailure(
              "unavailable",
              "We couldn't determine your location. Please try again or enter your address.",
            ),
          );
        } else {
          reject(
            new GeolocationFailure(
              "timeout",
              "Location lookup took too long. Please try again or enter your address.",
            ),
          );
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  });
}

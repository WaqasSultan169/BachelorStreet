"use client";

import { AlertTriangle, CheckCircle2, Info, MapPin, Search } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { UseMyLocationButton } from "@/components/location/use-my-location-button";
import type {
  Coordinates,
  CoverageResult,
  GeoResult,
  GeoSource,
} from "@/lib/types/location";

export type AddressDraft = {
  label: string;
  street: string;
  area: string;
  city: string;
  phone: string;
  instructions: string;
};

export const EMPTY_ADDRESS: AddressDraft = {
  label: "",
  street: "",
  area: "",
  city: "Islamabad",
  phone: "",
  instructions: "",
};

type SearchState = {
  status: "idle" | "loading" | "ready" | "error";
  results: GeoResult[];
  source: GeoSource;
};

type AddressFormProps = {
  query: string;
  onQueryChange: (value: string) => void;
  search: SearchState;
  onSelectResult: (result: GeoResult) => void;
  draft: AddressDraft;
  onField: (field: keyof AddressDraft, value: string) => void;
  coordinates: Coordinates | null;
  onUseLocation: () => void;
  locating: boolean;
  locationMessage: string | null;
  locationIsError: boolean;
  coverage: CoverageResult | null;
  coverageLoading: boolean;
  coverageFailed: boolean;
};

const inputClasses =
  "w-full rounded-xl border border-charcoal-200 bg-white px-3 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:border-tomato-500 focus:outline-none focus:ring-2 focus:ring-tomato-500/30";

export function AddressForm({
  query,
  onQueryChange,
  search,
  onSelectResult,
  draft,
  onField,
  coordinates,
  onUseLocation,
  locating,
  locationMessage,
  locationIsError,
  coverage,
  coverageLoading,
  coverageFailed,
}: AddressFormProps) {
  return (
    <div className="grid gap-5">
      <div>
        <label
          htmlFor="address-search"
          className="mb-1.5 block text-sm font-semibold text-charcoal-900"
        >
          Search your address
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-400" />
          <input
            id="address-search"
            type="text"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="e.g. H-13 Markaz, Islamabad"
            autoComplete="off"
            className={`${inputClasses} pl-9`}
          />
          {search.status === "loading" ? (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              <Spinner className="h-4 w-4" />
            </span>
          ) : null}
        </div>

        {search.results.length > 0 ? (
          <ul className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-charcoal-200 bg-white p-1">
            {search.results.map((result) => (
              <li key={result.id}>
                <button
                  type="button"
                  onClick={() => onSelectResult(result)}
                  className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-charcoal-900/5"
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-tomato-600" />
                  <span>
                    <span className="block font-medium text-charcoal-900">
                      {result.name}
                    </span>
                    <span className="block text-xs text-charcoal-500">
                      {result.address}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : search.status === "ready" && query.trim().length >= 3 ? (
          <p className="mt-2 text-xs text-charcoal-500">
            No matches. Try a nearby sector, or use your current location.
          </p>
        ) : null}

        {search.results.length > 0 && search.source === "demo" ? (
          <p className="mt-2 flex items-start gap-1.5 text-[11px] text-charcoal-400">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            Sample address lookup — these are approximate demo results, not
            production geocoding. Configure a geocoding provider for real results.
          </p>
        ) : null}
      </div>

      <UseMyLocationButton onClick={onUseLocation} loading={locating} />

      {locationMessage ? (
        <p
          className={`flex items-start gap-2 text-xs ${
            locationIsError ? "text-tomato-600" : "text-charcoal-500"
          }`}
          role={locationIsError ? "alert" : undefined}
        >
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {locationMessage}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="addr-label" className="mb-1 block text-xs font-semibold text-charcoal-700">
            Label
          </label>
          <input
            id="addr-label"
            type="text"
            value={draft.label}
            onChange={(event) => onField("label", event.target.value)}
            placeholder="Home, Office…"
            className={inputClasses}
          />
        </div>
        <div>
          <label htmlFor="addr-phone" className="mb-1 block text-xs font-semibold text-charcoal-700">
            Contact phone
          </label>
          <input
            id="addr-phone"
            type="tel"
            value={draft.phone}
            onChange={(event) => onField("phone", event.target.value)}
            placeholder="+92 3xx xxx xxxx"
            className={inputClasses}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="addr-street" className="mb-1 block text-xs font-semibold text-charcoal-700">
            House / street
          </label>
          <input
            id="addr-street"
            type="text"
            value={draft.street}
            onChange={(event) => onField("street", event.target.value)}
            placeholder="House 12, Street 4"
            className={inputClasses}
          />
        </div>
        <div>
          <label htmlFor="addr-area" className="mb-1 block text-xs font-semibold text-charcoal-700">
            Area / sector
          </label>
          <input
            id="addr-area"
            type="text"
            value={draft.area}
            onChange={(event) => onField("area", event.target.value)}
            placeholder="H-13"
            className={inputClasses}
          />
        </div>
        <div>
          <label htmlFor="addr-city" className="mb-1 block text-xs font-semibold text-charcoal-700">
            City
          </label>
          <input
            id="addr-city"
            type="text"
            value={draft.city}
            onChange={(event) => onField("city", event.target.value)}
            placeholder="Islamabad"
            className={inputClasses}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="addr-instructions" className="mb-1 block text-xs font-semibold text-charcoal-700">
            Delivery instructions (optional)
          </label>
          <textarea
            id="addr-instructions"
            value={draft.instructions}
            onChange={(event) => onField("instructions", event.target.value)}
            rows={2}
            placeholder="Gate code, landmark, call on arrival…"
            className={inputClasses}
          />
        </div>
      </div>

      <CoverageNote
        coordinates={coordinates}
        area={draft.area}
        coverage={coverage}
        loading={coverageLoading}
        failed={coverageFailed}
      />
    </div>
  );
}

function CoverageNote({
  coordinates,
  area,
  coverage,
  loading,
  failed,
}: {
  coordinates: Coordinates | null;
  area: string;
  coverage: CoverageResult | null;
  loading: boolean;
  failed: boolean;
}) {
  if (!coordinates && !area.trim()) {
    return (
      <p className="flex items-start gap-2 rounded-xl bg-cream-100 px-3 py-2.5 text-xs text-charcoal-500">
        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Choose an address search result or use your current location so we can verify the delivery distance. An area name alone cannot confirm coverage.
      </p>
    );
  }

  if (loading) {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-cream-100 px-3 py-2.5 text-xs text-charcoal-500">
        <Spinner className="h-3.5 w-3.5" />
        Checking delivery coverage…
      </p>
    );
  }

  if (failed || !coverage) {
    return (
      <p className="flex items-start gap-2 rounded-xl bg-tomato-100/60 px-3 py-2.5 text-xs text-tomato-700">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        We couldn&apos;t verify coverage for this address. Please try again.
      </p>
    );
  }

  if (coverage.status === "deliverable") {
    return (
      <div className="rounded-xl bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700">
        <p className="flex items-center gap-2 font-semibold">
          <CheckCircle2 className="h-3.5 w-3.5" />
          We deliver here
          {typeof coverage.distanceKm === "number"
            ? ` · ${coverage.distanceKm} km from ${coverage.branchName ?? "the branch"}`
            : ""}
        </p>
        <p className="mt-1 text-emerald-700/90">
          {coverage.zoneName ? `${coverage.zoneName}. ` : ""}
          {typeof coverage.deliveryFee === "number"
            ? `Delivery fee ${coverage.deliveryFee === 0 ? "free" : `${coverage.deliveryFee} PKR`}. `
            : ""}
          {coverage.radiusKm
            ? `Delivery radius ${coverage.radiusKm} km.`
            : ""}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-tomato-100/60 px-3 py-2.5 text-xs text-tomato-700">
      <p className="flex items-center gap-2 font-semibold">
        <AlertTriangle className="h-3.5 w-3.5" />
        Outside our delivery zone
      </p>
      <p className="mt-1">{coverage.message}</p>
      <p className="mt-1 text-tomato-700/80">
        You can switch to pickup, choose an address search result, or use your current location.
      </p>
    </div>
  );
}

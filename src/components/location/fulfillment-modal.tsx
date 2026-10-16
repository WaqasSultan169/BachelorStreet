"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, MapPin } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { closeLocationModal } from "@/store/slices/uiSlice";
import {
  selectBranch,
  selectFulfillmentComplete,
  setCoverage,
  setDeliveryAddress,
  setFulfillmentType,
} from "@/store/slices/locationSlice";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { FulfillmentSwitch } from "@/components/location/fulfillment-switch";
import { BranchList, SingleBranchCard } from "@/components/location/branch-list";
import { UseMyLocationButton } from "@/components/location/use-my-location-button";
import {
  AddressForm,
  EMPTY_ADDRESS,
  type AddressDraft,
} from "@/components/location/address-form";
import { requestCoordinates, GeolocationFailure } from "@/lib/geolocation";
import { findNearest, formatDistanceKm } from "@/lib/geo";
import type {
  BranchDto,
  Coordinates,
  CoverageResult,
  DeliveryAddress,
  GeoResult,
  GeoSource,
} from "@/lib/types/location";
import type { OrderType } from "@/lib/constants";

type BranchesState = {
  status: "loading" | "ready" | "error";
  branches: BranchDto[];
};

type SearchState = {
  status: "idle" | "loading" | "ready" | "error";
  results: GeoResult[];
  source: GeoSource;
};

type CoverageState = {
  key: string;
  status: "ready" | "error";
  coverage: CoverageResult | null;
};

const EMPTY_SEARCH: SearchState = { status: "idle", results: [], source: "demo" };

async function requestBranches(signal: AbortSignal): Promise<BranchDto[]> {
  const response = await fetch("/api/branches", { signal });
  const json = (await response.json()) as
    | { success: true; data: BranchDto[] }
    | { success: false };
  if (!json.success) throw new Error("branches");
  return json.data;
}

function draftFromAddress(address: DeliveryAddress | null): AddressDraft {
  if (!address) return { ...EMPTY_ADDRESS };
  return {
    label: address.label,
    street: address.street ?? "",
    area: address.area ?? "",
    city: address.city ?? "Islamabad",
    phone: address.phone ?? "",
    instructions: address.instructions ?? "",
  };
}

export function FulfillmentModal() {
  const dispatch = useAppDispatch();
  const open = useAppSelector(
    (state) =>
      state.ui.locationModalOpen ||
      (!state.ui.locationModalDismissed &&
        state.location.hydrated &&
        !selectFulfillmentComplete(state)),
  );

  const handleClose = useCallback(() => {
    dispatch(closeLocationModal());
  }, [dispatch]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="How would you like your order?"
      className="max-w-xl"
    >
      {open ? <FulfillmentContent onDone={handleClose} /> : null}
    </Dialog>
  );
}

function FulfillmentContent({ onDone }: { onDone: () => void }) {
  const dispatch = useAppDispatch();
  const initialType = useAppSelector((state) => state.location.fulfillmentType);
  const initialBranch = useAppSelector((state) => state.location.selectedBranch);
  const initialAddress = useAppSelector((state) => state.location.deliveryAddress);
  const initialCoverage = useAppSelector((state) => state.location.coverage);

  const [mode, setMode] = useState<OrderType>(initialType ?? "delivery");
  const [branchId, setBranchId] = useState<string | null>(
    initialBranch?.id ?? null,
  );
  const [branchesState, setBranchesState] = useState<BranchesState>({
    status: "loading",
    branches: [],
  });
  const [nearestId, setNearestId] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [locationIsError, setLocationIsError] = useState(false);

  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchState>(EMPTY_SEARCH);
  const [draft, setDraft] = useState<AddressDraft>(() =>
    draftFromAddress(initialAddress),
  );
  const [coordinates, setCoordinates] = useState<Coordinates | null>(
    initialAddress?.coordinates ?? null,
  );

  const coverageLookupKey = coordinates
    ? `${coordinates.lat},${coordinates.lng}`
    : draft.area.trim() && draft.city.trim()
      ? `area:${draft.area.trim().toLocaleLowerCase("en")}|${draft.city.trim().toLocaleLowerCase("en")}`
      : "";
  const [coverageState, setCoverageState] = useState<CoverageState>(() => ({
    key: initialAddress?.coordinates
      ? `${initialAddress.coordinates.lat},${initialAddress.coordinates.lng}`
      : initialAddress?.area
        ? `area:${initialAddress.area.trim().toLocaleLowerCase("en")}|${(initialAddress.city ?? "").trim().toLocaleLowerCase("en")}`
        : "",
    status: "ready",
    coverage: initialCoverage,
  }));

  const acceptBranches = useCallback((branches: BranchDto[]) => {
    setBranchesState({ status: "ready", branches });
    if (branches.length === 1) setBranchId(branches[0].id);
  }, []);

  const retryBranches = useCallback(() => {
    setBranchesState({ status: "loading", branches: [] });
    requestBranches(new AbortController().signal)
      .then(acceptBranches)
      .catch(() => setBranchesState({ status: "error", branches: [] }));
  }, [acceptBranches]);

  useEffect(() => {
    const controller = new AbortController();
    requestBranches(controller.signal)
      .then(acceptBranches)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setBranchesState({ status: "error", branches: [] });
      });
    return () => controller.abort();
  }, [acceptBranches]);

  // Debounced address search.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearch((prev) => ({ ...prev, status: "loading" }));
      const params = new URLSearchParams({ q });
      if (coordinates) {
        params.set("lat", String(coordinates.lat));
        params.set("lng", String(coordinates.lng));
      }
      fetch(`/api/geo/search?${params.toString()}`, { signal: controller.signal })
        .then(async (response) => {
          const json = (await response.json()) as
            | { success: true; data: { results: GeoResult[]; source: GeoSource } }
            | { success: false };
          if (!json.success) throw new Error("search");
          return json.data;
        })
        .then((data) =>
          setSearch({ status: "ready", results: data.results, source: data.source }),
        )
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setSearch({ status: "error", results: [], source: "demo" });
        });
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, coordinates]);

  // Only coordinates can prove the address is within the configured radius.
  useEffect(() => {
    if (mode !== "delivery" || !coverageLookupKey) return;
    const key = coverageLookupKey;
    const body = coordinates
      ? { coordinates }
      : { area: draft.area.trim(), city: draft.city.trim() || undefined };
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch("/api/delivery/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
        .then(async (response) => {
          const json = (await response.json()) as
            | { success: true; data: CoverageResult }
            | { success: false };
          if (!json.success) throw new Error("coverage");
          return json.data;
        })
        .then((coverage) => setCoverageState({ key, status: "ready", coverage }))
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setCoverageState({ key, status: "error", coverage: null });
        });
    }, coordinates ? 0 : 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [mode, coordinates, draft.area, draft.city, coverageLookupKey]);

  const coverage =
    coverageState.key === coverageLookupKey ? coverageState.coverage : null;
  const coverageLoading =
    Boolean(coverageLookupKey) && coverageState.key !== coverageLookupKey;
  const coverageFailed =
    coverageState.key === coverageLookupKey && coverageState.status === "error";

  const handleField = useCallback((field: keyof AddressDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSelectResult = useCallback((result: GeoResult) => {
    setCoordinates(result.coordinates);
    setDraft((prev) => ({
      ...prev,
      area: result.name || prev.area,
      city: result.address.split(",").slice(-1)[0]?.trim() || prev.city,
    }));
    setQuery(result.name);
    setSearch(EMPTY_SEARCH);
  }, []);

  const handleUseLocation = useCallback(async () => {
    setLocating(true);
    setLocationMessage(null);
    setLocationIsError(false);
    try {
      const coords = await requestCoordinates();

      if (mode === "pickup") {
        const near = findNearest(
          branchesState.branches,
          coords,
          (branch) => branch.coordinates,
        );
        if (!near) {
          setLocationMessage(
            "We found your location, but no branch has coordinates to compare.",
          );
          return;
        }
        setNearestId(near.item.id);
        if (branchesState.branches.length === 1) setBranchId(near.item.id);
        setLocationMessage(
          branchesState.branches.length === 1
            ? `Our branch is ${formatDistanceKm(near.distanceKm)} away.`
            : `Nearest branch: ${near.item.name} (${formatDistanceKm(
                near.distanceKm,
              )} away). Select it to continue.`,
        );
        return;
      }

      setCoordinates(coords);
      const response = await fetch(
        `/api/geo/reverse?lat=${coords.lat}&lng=${coords.lng}`,
      );
      const json = (await response.json()) as
        | { success: true; data: { result: GeoResult | null; source: GeoSource } }
        | { success: false };
      if (json.success && json.data.result) {
        const result = json.data.result;
        setDraft((prev) => ({
          ...prev,
          area: prev.area || result.name,
          city: prev.city || result.address.split(",").slice(-1)[0]?.trim() || "",
        }));
        setLocationMessage(
          `Using approximate location: ${result.address}. Please confirm the details below.`,
        );
      } else {
        setLocationMessage(
          "We found your location — please confirm the address details below.",
        );
      }
    } catch (error) {
      setLocationIsError(true);
      setLocationMessage(
        error instanceof GeolocationFailure
          ? error.message
          : "We couldn't get your location. Please try again.",
      );
    } finally {
      setLocating(false);
    }
  }, [mode, branchesState.branches]);

  const canContinue =
    mode === "pickup"
      ? Boolean(branchId)
      : Boolean(coverage?.deliverable);

  const handleConfirm = useCallback(() => {
    if (mode === "pickup") {
      const branch = branchesState.branches.find((item) => item.id === branchId);
      if (!branch) return;
      dispatch(setFulfillmentType("pickup"));
      dispatch(selectBranch(branch));
    } else {
      if (!coverage?.deliverable) return;
      const address: DeliveryAddress = {
        label: draft.label.trim() || "Delivery address",
        street: draft.street.trim() || undefined,
        area: draft.area.trim() || undefined,
        city: draft.city.trim() || undefined,
        phone: draft.phone.trim() || undefined,
        instructions: draft.instructions.trim() || undefined,
        coordinates: coordinates ?? undefined,
      };
      const branch = branchesState.branches.find(
        (item) => item.id === coverage.branchId,
      );
      dispatch(setFulfillmentType("delivery"));
      dispatch(setDeliveryAddress(address));
      dispatch(setCoverage(coverage));
      if (branch) dispatch(selectBranch(branch));
    }
    onDone();
  }, [
    mode,
    branchId,
    coordinates,
    coverage,
    draft,
    branchesState.branches,
    dispatch,
    onDone,
  ]);

  return (
    <div className="flex flex-col">
      <div className="px-6 pt-5">
        <p className="mb-4 text-sm text-charcoal-500">
          Choose how you&apos;d like to receive your order. You can change this
          anytime from the header.
        </p>
        <FulfillmentSwitch value={mode} onChange={setMode} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {mode === "pickup" ? (
              <div className="grid gap-4">
                {branchesState.status === "loading" ? (
                  <p className="flex items-center gap-2 py-6 text-sm text-charcoal-500">
                    <Spinner className="h-4 w-4" />
                    Loading branches…
                  </p>
                ) : branchesState.status === "error" ? (
                  <div className="rounded-2xl border border-tomato-600/20 bg-tomato-100/40 px-4 py-5 text-sm text-tomato-700">
                    <p className="flex items-center gap-2 font-semibold">
                      <AlertTriangle className="h-4 w-4" />
                      We couldn&apos;t load pickup branches
                    </p>
                    <p className="mt-1 text-tomato-700/90">
                      Please try again in a moment.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={retryBranches}
                    >
                      Retry
                    </Button>
                  </div>
                ) : branchesState.branches.length === 0 ? (
                  <p className="py-6 text-sm text-charcoal-500">
                    No pickup branches are available right now.
                  </p>
                ) : branchesState.branches.length === 1 ? (
                  <SingleBranchCard branch={branchesState.branches[0]} />
                ) : (
                  <BranchList
                    branches={branchesState.branches}
                    selectedId={branchId}
                    nearestId={nearestId}
                    onSelect={setBranchId}
                  />
                )}

                <UseMyLocationButton onClick={handleUseLocation} loading={locating} />

                {locationMessage ? (
                  <p
                    className={`flex items-start gap-2 text-xs ${
                      locationIsError ? "text-tomato-600" : "text-charcoal-500"
                    }`}
                    role={locationIsError ? "alert" : undefined}
                  >
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {locationMessage}
                  </p>
                ) : null}
              </div>
            ) : (
              <AddressForm
                query={query}
                onQueryChange={setQuery}
                search={search}
                onSelectResult={handleSelectResult}
                draft={draft}
                onField={handleField}
                coordinates={coordinates}
                onUseLocation={handleUseLocation}
                locating={locating}
                locationMessage={locationMessage}
                locationIsError={locationIsError}
                coverage={coverage}
                coverageLoading={coverageLoading}
                coverageFailed={coverageFailed}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="border-t border-charcoal-900/10 bg-white px-6 py-4">
        <Button
          className="w-full"
          size="lg"
          disabled={!canContinue}
          onClick={handleConfirm}
        >
          Continue with {mode === "pickup" ? "pickup" : "delivery"}
        </Button>
        <p className="mt-2 text-center text-xs text-charcoal-400">
          {mode === "pickup"
            ? branchesState.branches.length === 1
              ? "Pickup at Bachelor's Street, H-13."
              : "Select a branch to continue."
            : "Choose an address search result or use your current location to verify delivery distance."}
        </p>
      </div>
    </div>
  );
}

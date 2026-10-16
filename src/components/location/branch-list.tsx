"use client";

import { ExternalLink, MapPin, Navigation, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { BranchDto } from "@/lib/types/location";

type BranchListProps = {
  branches: BranchDto[];
  selectedId: string | null;
  nearestId: string | null;
  onSelect: (id: string) => void;
};

function openLabel(branch: BranchDto): { text: string; variant: "success" | "neutral" } {
  if (branch.isOpenNow === true) return { text: "Open now", variant: "success" };
  if (branch.isOpenNow === false) return { text: "Closed", variant: "neutral" };
  return { text: "Hours unavailable", variant: "neutral" };
}

export function SingleBranchCard({ branch }: { branch: BranchDto }) {
  const open = openLabel(branch);

  return (
    <div className="rounded-2xl border border-tomato-500 bg-tomato-100/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-semibold text-charcoal-900">
            <Store className="h-4 w-4 text-tomato-600" />
            {branch.name}
          </p>
          <p className="mt-2 flex items-start gap-1.5 text-sm text-charcoal-500">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {branch.address}
          </p>
        </div>
        <Badge variant={open.variant}>{open.text}</Badge>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-tomato-500/10 pt-3 text-xs text-charcoal-500">
        <span>
          {branch.todayHours ? `Today: ${branch.todayHours}` : branch.city}
          {branch.phone ? ` · ${branch.phone}` : ""}
        </span>
        {branch.mapsUrl ? (
          <a
            href={branch.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-tomato-600 hover:text-tomato-500"
          >
            Get directions
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
      </div>
    </div>
  );
}

export function BranchList({
  branches,
  selectedId,
  nearestId,
  onSelect,
}: BranchListProps) {
  return (
    <ul className="grid gap-3" role="radiogroup" aria-label="Pickup branch">
      {branches.map((branch) => {
        const selected = selectedId === branch.id;
        const open = openLabel(branch);
        return (
          <li key={branch.id}>
            <label
              className={cn(
                "flex cursor-pointer flex-col gap-3 rounded-2xl border p-4 transition-colors",
                selected
                  ? "border-tomato-500 bg-tomato-100/40"
                  : "border-charcoal-200 hover:border-charcoal-300",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="branch"
                    className="mt-1 h-4 w-4 accent-tomato-600"
                    checked={selected}
                    onChange={() => onSelect(branch.id)}
                  />
                  <div>
                    <p className="flex flex-wrap items-center gap-2 font-semibold text-charcoal-900">
                      <Store className="h-4 w-4 text-tomato-600" />
                      {branch.name}
                      {nearestId === branch.id ? (
                        <Badge variant="gold">
                          <Navigation className="h-3 w-3" />
                          Nearest
                        </Badge>
                      ) : null}
                    </p>
                    <p className="mt-1 flex items-start gap-1.5 text-sm text-charcoal-500">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {branch.address}
                    </p>
                  </div>
                </div>
                <Badge variant={open.variant}>{open.text}</Badge>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pl-7 text-xs text-charcoal-500">
                <span>
                  {branch.todayHours ? `Today: ${branch.todayHours}` : branch.city}
                  {branch.phone ? ` · ${branch.phone}` : ""}
                </span>
                {branch.mapsUrl ? (
                  <a
                    href={branch.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    className="inline-flex items-center gap-1 font-semibold text-tomato-600 hover:text-tomato-500"
                  >
                    Get directions
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

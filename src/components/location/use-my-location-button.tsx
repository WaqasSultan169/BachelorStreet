"use client";

import { LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UseMyLocationButton({
  onClick,
  loading,
}: {
  onClick: () => void;
  loading: boolean;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      loading={loading}
    >
      {loading ? null : <LocateFixed className="h-4 w-4" />}
      Use my current location
    </Button>
  );
}

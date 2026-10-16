"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TrackForm() {
  const router = useRouter();
  const [value, setValue] = useState("");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const id = value.trim();
        if (id) router.push(`/order/${encodeURIComponent(id)}`);
      }}
      className="mx-auto mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row"
    >
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-400" />
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="e.g. BS-1A2B3C"
          aria-label="Order tracking code"
          className="h-12 w-full rounded-full border border-charcoal-200 bg-white pl-11 pr-4 text-sm text-charcoal-900 shadow-[var(--shadow-card)] outline-none transition-colors placeholder:text-charcoal-400 focus:border-flame-500 focus:ring-2 focus:ring-flame-500/20"
        />
      </div>
      <Button type="submit" size="lg" className="shrink-0">
        Track order
        <ArrowRight className="h-4 w-4" />
      </Button>
    </form>
  );
}

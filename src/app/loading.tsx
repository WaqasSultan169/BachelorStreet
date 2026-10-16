import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-charcoal-500">
        <Spinner className="h-7 w-7" />
        <p className="text-sm">Loading…</p>
      </div>
    </div>
  );
}
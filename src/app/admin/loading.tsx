export default function AdminDashboardLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="space-y-3">
        <div className="h-3 w-24 animate-pulse rounded-full bg-charcoal-100" />
        <div className="h-8 w-72 animate-pulse rounded-lg bg-charcoal-100" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-charcoal-100" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-charcoal-200/70"
          />
        ))}
      </div>

      <div className="h-80 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-charcoal-200/70" />

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="h-72 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-charcoal-200/70" />
        <div className="h-72 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-charcoal-200/70" />
      </div>
    </div>
  );
}

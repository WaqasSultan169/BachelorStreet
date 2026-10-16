import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

export default function MenuLoading() {
  return (
    <div className="pb-24 pt-12">
      <Container>
        <Skeleton className="mb-3 h-4 w-28" />
        <Skeleton className="mb-10 h-9 w-56" />
        <div className="space-y-16">
          {[0, 1].map((section) => (
            <div key={section}>
              <Skeleton className="mb-6 h-7 w-40" />
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((card) => (
                  <div
                    key={card}
                    className="overflow-hidden rounded-2xl border border-charcoal-200/70 bg-white"
                  >
                    <Skeleton className="h-36 rounded-none" />
                    <div className="space-y-3 p-5">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}
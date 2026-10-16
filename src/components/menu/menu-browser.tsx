"use client";

import { useEffect, useRef, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { ProductCard } from "@/components/menu/product-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MENU_SORT_OPTIONS,
  type MenuCategoryDto,
  type MenuSortKey,
  type ProductListResult,
} from "@/lib/types/menu";
import { cn } from "@/lib/utils";

type MenuFilters = {
  q: string;
  category: string;
  sort: MenuSortKey;
  available: boolean;
  page: number;
};

type MenuBrowserProps = {
  initialData: ProductListResult;
  categories: MenuCategoryDto[];
  initialFilters: MenuFilters;
};

function GridSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-2xl border border-charcoal-200/70 bg-white"
        >
          <Skeleton className="h-44 w-full rounded-none" />
          <div className="space-y-3 p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MenuBrowser({
  initialData,
  categories,
  initialFilters,
}: MenuBrowserProps) {
  const [query, setQuery] = useState(initialFilters.q);
  const [debouncedQuery, setDebouncedQuery] = useState(initialFilters.q);
  const [category, setCategory] = useState(initialFilters.category);
  const [sort, setSort] = useState<MenuSortKey>(initialFilters.sort);
  const [available, setAvailable] = useState(initialFilters.available);
  const [page, setPage] = useState(initialFilters.page);
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const isFirstRun = useRef(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams();
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (category) params.set("category", category);
    if (sort) params.set("sort", sort);
    if (available) params.set("available", "true");
    params.set("page", String(page));

    setLoading(true);
    setError(null);

    fetch(`/api/products?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const json = (await response.json()) as
          | { success: true; data: ProductListResult }
          | { success: false; error: { message: string } };
        if (!json.success) throw new Error(json.error.message);
        setData(json.data);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("We couldn't load the menu. Please try again.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [debouncedQuery, category, sort, available, page, nonce]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (category) params.set("category", category);
    if (sort && sort !== "popular") params.set("sort", sort);
    if (available) params.set("available", "true");
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `/menu?${qs}` : "/menu");
  }, [debouncedQuery, category, sort, available, page]);

  const clearFilters = () => {
    setQuery("");
    setDebouncedQuery("");
    setCategory("");
    setSort("popular");
    setAvailable(false);
    setPage(1);
  };

  const hasFilters =
    Boolean(debouncedQuery) || Boolean(category) || available || sort !== "popular";

  return (
    <div>
      <div className="sticky top-16 z-30 -mx-4 mb-8 border-b border-charcoal-900/10 bg-cream-50/95 px-4 py-4 backdrop-blur-md sm:mx-0 sm:rounded-2xl sm:border sm:border-charcoal-200/70 sm:px-5">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-400" />
              <label htmlFor="menu-search" className="sr-only">
                Search the menu
              </label>
              <input
                id="menu-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search dishes, drinks, tags…"
                className="h-11 w-full rounded-full border border-charcoal-200 bg-white pl-10 pr-10 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:border-tomato-500 focus:outline-none focus:ring-2 focus:ring-tomato-500/40"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-charcoal-400 hover:text-charcoal-700"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-400" />
                <label htmlFor="menu-sort" className="sr-only">
                  Sort products
                </label>
                <select
                  id="menu-sort"
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value as MenuSortKey);
                    setPage(1);
                  }}
                  className="h-11 appearance-none rounded-full border border-charcoal-200 bg-white pl-9 pr-9 text-sm font-medium text-charcoal-800 focus:border-tomato-500 focus:outline-none focus:ring-2 focus:ring-tomato-500/40"
                >
                  {MENU_SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <label className="inline-flex h-11 cursor-pointer select-none items-center gap-2 rounded-full border border-charcoal-200 bg-white px-4 text-sm font-medium text-charcoal-800">
                <input
                  type="checkbox"
                  checked={available}
                  onChange={(event) => {
                    setAvailable(event.target.checked);
                    setPage(1);
                  }}
                  className="h-4 w-4 accent-tomato-600"
                />
                In stock
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setCategory("");
                setPage(1);
              }}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                category === ""
                  ? "border-tomato-600 bg-tomato-600 text-white"
                  : "border-charcoal-200 bg-white text-charcoal-700 hover:border-charcoal-300",
              )}
            >
              All
            </button>
            {categories.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setCategory(item.slug);
                  setPage(1);
                }}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  category === item.slug
                    ? "border-tomato-600 bg-tomato-600 text-white"
                    : "border-charcoal-200 bg-white text-charcoal-700 hover:border-charcoal-300",
                )}
              >
                {item.name}
                <span className="ml-1.5 text-xs opacity-70">
                  {item.productCount}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-sm text-charcoal-500">
          {loading ? "Updating results…" : `${data.total} ${data.total === 1 ? "item" : "items"}`}
          {hasFilters ? " matching your filters" : ""}
        </p>
        {hasFilters ? (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        ) : null}
      </div>

      {error ? (
        <ErrorState
          description={error}
          action={
            <Button onClick={() => setNonce((value) => value + 1)}>Try again</Button>
          }
        />
      ) : loading ? (
        <GridSkeleton />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={<Search className="h-6 w-6" />}
          title="No dishes found"
          description="Try a different search term or clear your filters to see the full menu."
          action={
            hasFilters ? (
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {!loading && !error && data.totalPages > 1 ? (
        <nav
          className="mt-10 flex items-center justify-center gap-3"
          aria-label="Menu pagination"
        >
          <Button
            variant="outline"
            size="sm"
            disabled={data.page <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-charcoal-500">
            Page {data.page} of {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={data.page >= data.totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </Button>
        </nav>
      ) : null}
    </div>
  );
}

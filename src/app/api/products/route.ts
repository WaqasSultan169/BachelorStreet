import type { NextRequest } from "next/server";
import { ok, withApiHandler } from "@/lib/api-response";
import { listProducts } from "@/server/services/menu.service";
import { MENU_SORT_OPTIONS, type MenuSortKey } from "@/lib/types/menu";

export const dynamic = "force-dynamic";

const SORT_KEYS = new Set<string>(MENU_SORT_OPTIONS.map((option) => option.value));

function parseSort(value: string | null): MenuSortKey {
  return value && SORT_KEYS.has(value) ? (value as MenuSortKey) : "popular";
}

export const GET = withApiHandler(async (req: NextRequest) => {
  const params = req.nextUrl.searchParams;
  const page = Number.parseInt(params.get("page") ?? "1", 10);
  const pageSize = Number.parseInt(params.get("pageSize") ?? "12", 10);

  const result = await listProducts({
    q: params.get("q") ?? undefined,
    categorySlug: params.get("category") ?? undefined,
    sort: parseSort(params.get("sort")),
    page: Number.isFinite(page) ? page : 1,
    pageSize: Number.isFinite(pageSize) ? pageSize : 12,
    availableOnly: params.get("available") === "true",
  });

  return ok(result, {
    meta: {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
    },
  });
});

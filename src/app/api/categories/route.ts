import { ok, withApiHandler } from "@/lib/api-response";
import { getCategories } from "@/server/services/menu.service";

export const dynamic = "force-dynamic";

export const GET = withApiHandler(async () => ok(await getCategories()));

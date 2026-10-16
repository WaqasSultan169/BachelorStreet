import { ok, withApiHandler } from "@/lib/api-response";
import { listBranches } from "@/server/services/location.service";

export const dynamic = "force-dynamic";

export const GET = withApiHandler(async () => {
  const branches = await listBranches();
  return ok(branches);
});

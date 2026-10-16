import type { NextRequest } from "next/server";
import { ok, withApiHandler } from "@/lib/api-response";
import { BadRequestError } from "@/lib/errors";
import {
  checkCoverage,
  checkCoverageByArea,
} from "@/server/services/location.service";
import { validate } from "@/server/validation/common";
import { deliveryCheckSchema } from "@/server/validation/location";

export const dynamic = "force-dynamic";

export const POST = withApiHandler(async (req: NextRequest) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new BadRequestError("Expected a JSON body");
  }

  const { coordinates, branchId } = validate(
    deliveryCheckSchema,
    body,
    "delivery",
  );
  const coverage = coordinates
    ? await checkCoverage(coordinates, branchId)
    : await checkCoverageByArea();
  return ok(coverage);
});

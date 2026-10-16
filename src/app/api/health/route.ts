import { ok, withApiHandler } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export const GET = withApiHandler(async () =>
  ok({
    status: "ok",
    service: "bachelor-street-cafe",
    time: new Date().toISOString(),
  }),
);
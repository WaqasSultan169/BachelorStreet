import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { requireRole } from "@/server/middleware/require-auth";
import { listAdminResources } from "@/server/services/admin.service";
import { LocationsClient } from "@/app/admin/locations/locations-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Branches and delivery coverage" };

export default async function AdminLocationsPage() {
  await requireRole(["admin"]);
  const { branches, zones } = await listAdminResources();
  return (
    <Container className="max-w-6xl py-10">
      <h1 className="font-display text-3xl font-semibold text-charcoal-900">Branches and delivery coverage</h1>
      <p className="mt-2 text-sm text-charcoal-500">Branch hours, availability, delivery areas, zone fees, minimum orders, and estimated times.</p>
      <LocationsClient branches={branches} zones={zones} />
    </Container>
  );
}

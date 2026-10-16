import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { requireRole } from "@/server/middleware/require-auth";
import { listAdminResources } from "@/server/services/admin.service";
import { CatalogClient } from "@/app/admin/catalog/catalog-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Catalog and stock" };

export default async function AdminCatalogPage() {
  await requireRole(["admin"]);
  const { products, categories } = await listAdminResources();
  return (
    <Container className="max-w-7xl py-10">
      <h1 className="font-display text-3xl font-semibold text-charcoal-900">Catalog and stock</h1>
      <p className="mt-2 text-sm text-charcoal-500">Edit product prices and inventory, control availability, and manage menu categories.</p>
      <CatalogClient products={products} categories={categories} />
    </Container>
  );
}

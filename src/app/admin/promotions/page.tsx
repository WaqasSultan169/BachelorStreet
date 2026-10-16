import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { requireRole } from "@/server/middleware/require-auth";
import { listAdminResources } from "@/server/services/admin.service";
import { PromotionsClient } from "@/app/admin/promotions/promotions-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Promotions and banners" };

export default async function AdminPromotionsPage() {
  await requireRole(["admin"]);
  const { promotions } = await listAdminResources();
  return (
    <Container className="max-w-5xl py-10">
      <h1 className="font-display text-3xl font-semibold text-charcoal-900">Promotions and banners</h1>
      <p className="mt-2 text-sm text-charcoal-500">Manage discount codes and banner content. Discount rules are stored separately from orders; customers will only be charged a discount when validated by checkout.</p>
      <PromotionsClient promotions={promotions} />
    </Container>
  );
}

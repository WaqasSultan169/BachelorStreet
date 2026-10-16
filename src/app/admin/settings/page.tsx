import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { requireRole } from "@/server/middleware/require-auth";
import { getAdminStoreSettings } from "@/server/services/admin.service";
import { StoreSettingsClient } from "@/app/admin/settings/settings-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Delivery settings" };

export default async function AdminSettingsPage() {
  await requireRole(["admin"]);
  const settings = await getAdminStoreSettings();
  return (
    <Container className="max-w-3xl py-10">
      <h1 className="font-display text-3xl font-semibold text-charcoal-900">Delivery settings</h1>
      <p className="mt-2 text-sm text-charcoal-500">Changes apply to future delivery coverage checks and orders. Zone delivery fees and operating hours are managed under branches and coverage.</p>
      <StoreSettingsClient settings={settings} />
    </Container>
  );
}

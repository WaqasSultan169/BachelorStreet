import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { requireRole } from "@/server/middleware/require-auth";
import { searchAdminCustomers } from "@/server/services/admin.service";
import { CustomersClient } from "@/app/admin/customers/customers-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Customer management" };

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireRole(["admin"]);
  const query = await searchParams;
  const parsedPage = Number(query.page ?? "1");
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const results = await searchAdminCustomers({ q: query.q?.slice(0, 100), page, pageSize: 20 });
  return (
    <Container className="max-w-6xl py-10">
      <h1 className="font-display text-3xl font-semibold text-charcoal-900">Customers</h1>
      <p className="mt-2 text-sm text-charcoal-500">Personal data is limited to account contact details; phone numbers are masked. Access changes are audited and revoke active sessions.</p>
      <CustomersClient results={results} query={query.q ?? ""} />
    </Container>
  );
}

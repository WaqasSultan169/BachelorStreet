import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { requireRole } from "@/server/middleware/require-auth";
import { searchAdminStaff } from "@/server/services/admin.service";
import { StaffClient } from "@/app/admin/staff/staff-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Staff management" };

export default async function AdminStaffPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireRole(["admin"]);
  const query = await searchParams;
  const parsedPage = Number(query.page ?? "1");
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const results = await searchAdminStaff({ q: query.q?.slice(0, 100), page, pageSize: 20 });
  return (
    <Container className="max-w-6xl py-10">
      <h1 className="font-display text-3xl font-semibold text-charcoal-900">Staff and delivery personnel</h1>
      <p className="mt-2 text-sm text-charcoal-500">Role/access changes revoke the user’s existing sessions and are audited. Notification consent can only be changed by the account holder.</p>
      <StaffClient results={results} query={query.q ?? ""} />
    </Container>
  );
}

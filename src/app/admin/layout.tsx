import type { Metadata } from "next";
import { requireRole } from "@/server/middleware/require-auth";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: {
    default: "Admin",
    template: "%s | Bachelor's Street Admin",
  },
  robots: { index: false, follow: false },
};

/**
 * Dedicated admin shell. Authorization is enforced server-side here (and again
 * in each admin page), and the customer header/footer are hidden on `/admin`
 * by `SiteChrome` in the root layout.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["admin"]);
  return (
    <AdminShell
      user={{
        name: user.name ?? "Administrator",
        email: user.email ?? "",
        role: user.role,
      }}
    >
      {children}
    </AdminShell>
  );
}

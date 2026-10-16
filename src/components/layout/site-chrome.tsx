"use client";

import { usePathname } from "next/navigation";

/**
 * Decides whether the customer-facing header/footer should render.
 *
 * The root layout is a server component and cannot read the pathname, so this
 * small client boundary receives the (server-rendered) header and footer and
 * hides them for every `/admin` route. Everything outside `/admin` is
 * untouched, so the storefront keeps its header and footer everywhere else.
 */
export function SiteChrome({
  header,
  footer,
  children,
}: {
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname === "/admin" || pathname?.startsWith("/admin/");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      {header}
      <main className="flex-1">{children}</main>
      {footer}
    </>
  );
}

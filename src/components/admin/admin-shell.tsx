"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bike,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MapPin,
  Megaphone,
  Menu,
  SlidersHorizontal,
  Sparkles,
  Store,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { LogoMark } from "@/components/layout/logo";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { logout } from "@/server/actions/auth";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

type NavGroup = { title: string; items: NavItem[] };

/**
 * Every href below resolves to a real page in `src/app/admin`. Categories are
 * managed inside the catalog page, so there is no separate dead link for them.
 */
const NAV_GROUPS: NavGroup[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", href: "/admin", icon: LayoutDashboard, exact: true }],
  },
  {
    title: "Operations",
    items: [{ label: "Orders", href: "/admin/orders", icon: ClipboardList }],
  },
  {
    title: "Menu",
    items: [{ label: "Menu & categories", href: "/admin/catalog", icon: UtensilsCrossed }],
  },
  {
    title: "Customers",
    items: [{ label: "Customers", href: "/admin/customers", icon: Users }],
  },
  {
    title: "Delivery",
    items: [
      { label: "Delivery personnel", href: "/admin/staff", icon: Bike },
      { label: "Delivery settings", href: "/admin/settings", icon: SlidersHorizontal },
    ],
  },
  {
    title: "Marketing",
    items: [
      { label: "Deals & promotions", href: "/admin/promotions", icon: Megaphone },
      { label: "Hero slides", href: "/admin/hero", icon: Sparkles },
    ],
  },
  {
    title: "Setup",
    items: [{ label: "Branches & zones", href: "/admin/locations", icon: MapPin }],
  },
];

const CRUMB_LABELS: Record<string, string> = {
  admin: "Admin",
  orders: "Orders",
  catalog: "Menu & categories",
  customers: "Customers",
  staff: "Delivery personnel",
  promotions: "Deals & promotions",
  hero: "Hero slides",
  locations: "Branches & zones",
  settings: "Delivery settings",
};

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "A"
  );
}

function isActive(pathname: string | null, item: NavItem): boolean {
  if (!pathname) return false;
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function useBreadcrumbs(pathname: string | null) {
  const segments = (pathname ?? "").split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];
  let href = "";
  segments.forEach((segment, index) => {
    href += `/${segment}`;
    const isId = index === segments.length - 1 && segments.length > 2 && /^[a-f\d]{24}$/i.test(segment);
    const label = isId ? "Details" : CRUMB_LABELS[segment] ?? segment.replace(/-/g, " ");
    crumbs.push({ href, label });
  });
  return crumbs;
}

function NavLink({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = isActive(pathname, item);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame-400",
        active
          ? "bg-flame-500/15 text-flame-200"
          : "text-cream-100/70 hover:bg-white/10 hover:text-cream-50",
        collapsed && "justify-center px-0",
      )}
    >
      {active ? (
        <span
          aria-hidden
          className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-flame-400"
        />
      ) : null}
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed ? <span className="truncate">{item.label}</span> : null}
    </Link>
  );
}

function SidebarContent({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4 no-scrollbar" aria-label="Admin">
      {NAV_GROUPS.map((group) => (
        <div key={group.title}>
          {!collapsed ? (
            <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-flame-400/90">
              {group.title}
            </p>
          ) : null}
          <div className="space-y-1">
            {group.items.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function ProfileMenu({ user }: { user: { name: string; email: string; role: string } }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2.5 rounded-full py-1 pr-3 pl-1 transition-colors hover:bg-charcoal-100/70"
      >
        <span className="flex h-9 w-9 select-none items-center justify-center rounded-full bg-flame-500/15 text-sm font-bold text-flame-700">
          {initialsOf(user.name)}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block max-w-40 truncate text-sm font-semibold text-charcoal-900">
            {user.name}
          </span>
          <span className="block text-[11px] uppercase tracking-wide text-charcoal-400">
            {user.role === "admin" ? "Administrator" : user.role}
          </span>
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-charcoal-200/70 bg-white shadow-[var(--shadow-lift)]"
        >
          <div className="border-b border-charcoal-100 px-4 py-3">
            <p className="truncate text-sm font-semibold text-charcoal-900">{user.name}</p>
            <p className="truncate text-xs text-charcoal-500">{user.email || "No email on file"}</p>
          </div>
          <Link
            href="/"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-charcoal-700 transition-colors hover:bg-cream-100"
          >
            <Store className="h-4 w-4 text-charcoal-400" />
            View storefront
          </Link>
          <button
            type="button"
            role="menuitem"
            disabled={pending}
            onClick={() => startTransition(() => void logout())}
            className="flex w-full items-center gap-2.5 border-t border-charcoal-100 px-4 py-2.5 text-sm font-medium text-tomato-600 transition-colors hover:bg-tomato-100/50 disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" />
            {pending ? "Signing out…" : "Sign out"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function AdminShell({
  user,
  children,
}: {
  user: { name: string; email: string; role: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const crumbs = useBreadcrumbs(pathname);
  const currentTitle =
    pathname === "/admin" ? "Dashboard" : (crumbs[crumbs.length - 1]?.label ?? "Dashboard");

  useLockBodyScroll(drawerOpen);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  return (
    <div className="min-h-dvh bg-cream-100 text-charcoal-900">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-white/10 bg-ink-950 transition-[width] duration-200 lg:flex",
          collapsed ? "w-[84px]" : "w-[268px]",
        )}
      >
        <div className={cn("flex items-center gap-3 px-4 py-5", collapsed && "justify-center px-0")}>
          <LogoMark className="h-10 w-10" />
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-black text-cream-50">
                Bachelor&apos;s Street
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-flame-400">
                Admin Panel
              </p>
            </div>
          ) : null}
        </div>
        <SidebarContent collapsed={collapsed} />
        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-cream-100/70 transition-colors hover:bg-white/10 hover:text-cream-50",
              collapsed && "justify-center px-0",
            )}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            {!collapsed ? "Collapse" : null}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-ink-950/60 lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      ) : null}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-ink-950 transition-transform duration-200 lg:hidden",
          drawerOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-hidden={!drawerOpen}
      >
        <div className="flex items-center justify-between px-4 py-5">
          <div className="flex items-center gap-3">
            <LogoMark className="h-10 w-10" />
            <div>
              <p className="font-display text-sm font-black text-cream-50">Bachelor&apos;s Street</p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-flame-400">
                Admin Panel
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close navigation"
            className="flex h-9 w-9 items-center justify-center rounded-full text-cream-50 hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <SidebarContent collapsed={false} onNavigate={() => setDrawerOpen(false)} />
      </div>

      {/* Content column */}
      <div className={cn("flex min-h-dvh flex-col", collapsed ? "lg:pl-[84px]" : "lg:pl-[268px]")}>
        <header className="sticky top-0 z-20 border-b border-charcoal-200/70 bg-cream-100/85 backdrop-blur-md">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open navigation"
                className="flex h-10 w-10 items-center justify-center rounded-full text-charcoal-700 transition-colors hover:bg-charcoal-100 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <nav aria-label="Breadcrumb" className="hidden sm:block">
                  <ol className="flex items-center gap-1.5 text-xs text-charcoal-400">
                    {crumbs.map((crumb, index) => (
                      <li key={crumb.href} className="flex items-center gap-1.5">
                        {index > 0 ? <ChevronRight className="h-3 w-3" aria-hidden /> : null}
                        {index === crumbs.length - 1 ? (
                          <span aria-current="page" className="text-charcoal-500">
                            {crumb.label}
                          </span>
                        ) : (
                          <Link
                            href={crumb.href}
                            className="transition-colors hover:text-charcoal-700"
                          >
                            {crumb.label}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ol>
                </nav>
                <p className="truncate font-display text-lg font-bold text-charcoal-900 sm:text-xl">
                  {currentTitle}
                </p>
              </div>
            </div>
            <ProfileMenu user={user} />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

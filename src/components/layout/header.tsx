"use client";

import { useEffect, useState } from "react";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { LogIn, Menu, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartButton } from "@/components/cart/cart-button";
import { LocationButton } from "@/components/location/location-button";
import { SignOutButton } from "@/components/layout/signout-button";
import Image from "next/image";

type NavLink = {
  key: string;
  label: string;
  href: React.ComponentProps<typeof Link>["href"];
};

const NAV_LINKS: NavLink[] = [
  { key: "home", label: "Home", href: "/" },
  { key: "menu", label: "Menu", href: "/menu" },
  { key: "deals", label: "Deals", href: "/#deals" },
  { key: "track", label: "Track order", href: "/track" },
];

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function HeaderUserChip({ name }: { name: string }) {
  return (
    <div
      className="hidden items-center gap-3 md:flex"
      aria-label={`Signed in as ${name}`}
    >
      <Link
        href="/account"
        className="flex items-center gap-3 rounded-full py-1 pr-3 pl-1 transition-colors hover:bg-white/10"
      >
        <span className="flex h-9 w-9 select-none items-center justify-center rounded-full bg-flame-500/15 text-sm font-semibold text-flame-600">
          {initialsOf(name) || "?"}
        </span>
        <span className="max-w-32 truncate text-sm font-medium text-cream-50">
          {name}
        </span>
      </Link>
      <SignOutButton className="text-cream-100 hover:bg-white/10 hover:text-white" />
    </div>
  );
}

export function HeaderNav({ user }: { user?: { name: string } | null }) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-950/95 text-cream-50 backdrop-blur-md">
        <div className="mx-auto flex h-17 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="Bachelor's Street — home" className="shrink-0">
            <Image
              src="/brand/logo-lockup.svg"
              alt="Bachelor's Street"
              width={216}
              height={48}
              className="h-11 w-auto sm:h-12"
            />
          </Link>

          <nav className="hidden items-center gap-0.5 md:flex" aria-label="Main">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                className="rounded-full px-3.5 py-2 text-sm font-semibold text-cream-100/75 transition-colors hover:bg-white/10 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <LocationButton tone="dark" className="hidden lg:inline-flex" />

            {user ? (
              <HeaderUserChip name={user.name} />
            ) : (
              <Link
                href="/login"
                aria-label="Sign in"
                className="hidden h-10 w-10 items-center justify-center rounded-full text-cream-100 transition-colors hover:bg-white/10 hover:text-white md:inline-flex"
              >
                <UserRound className="h-5 w-5" />
              </Link>
            )}

            <Link
              href={user ? "/account" : "/login"}
              aria-label={user ? "My account" : "Sign in"}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-cream-100 transition-colors hover:bg-white/10 hover:text-white md:hidden"
            >
              <UserRound className="h-5 w-5" />
            </Link>

            <CartButton className="text-cream-100 hover:bg-white/10 hover:text-white" />

            <Button
              href="/menu"
              size="sm"
              className="hidden bg-linear-to-r from-tomato-600 to-flame-500 shadow-(--shadow-glow) hover:from-tomato-500 hover:to-flame-400 sm:inline-flex"
            >
              Order now
            </Button>

            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-cream-100 transition-colors hover:bg-white/10 hover:text-white md:hidden"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {open ? (
            <motion.nav
              key="mobile-nav"
              initial={reduceMotion ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.22, ease: "easeOut" }}
              className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-white/10 bg-ink-950 md:hidden"
              aria-label="Mobile"
            >
              <div className="flex flex-col gap-1 px-4 py-4">
                <LocationButton
                  tone="dark"
                  className="mb-2 w-full justify-between lg:hidden"
                  onClick={() => setOpen(false)}
                />
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.key}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="rounded-xl px-3 py-3 text-base font-semibold text-cream-100 hover:bg-white/10"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="mt-3 flex flex-col gap-2 border-t border-charcoal-900/10 pt-3">
                  {user ? (
                    <>
                      <span className="px-3 text-sm text-cream-100/60">
                        Signed in as {user.name}
                      </span>
                      <Button
                        href="/account"
                        variant="ghost"
                        className="justify-start text-cream-100 hover:bg-white/10 hover:text-white"
                        onClick={() => setOpen(false)}
                      >
                        My account
                      </Button>
                      <SignOutButton className="justify-start text-cream-100 hover:bg-white/10 hover:text-white" />
                    </>
                  ) : (
                    <Button href="/login" variant="outline" className="border-white/20 text-cream-50 hover:bg-white/10">
                      <LogIn className="h-4 w-4" />
                      Sign in
                    </Button>
                  )}
                  <Button
                    href="/menu"
                    className="bg-linear-to-r from-tomato-600 to-flame-500"
                    onClick={() => setOpen(false)}
                  >
                    Order now
                  </Button>
                </div>
              </div>
            </motion.nav>
          ) : null}
        </AnimatePresence>
      </header>
    </>
  );
}

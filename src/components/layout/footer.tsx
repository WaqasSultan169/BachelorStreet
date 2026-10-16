"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { Facebook, Instagram } from "@/components/icons/social";
import { APP } from "@/lib/constants";
import { Container } from "@/components/ui/container";
import { Brand } from "@/components/layout/brand";

export function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith("/login") || pathname?.startsWith("/register")) {
    return null;
  }
  const year = new Date().getFullYear();

  return (
    <footer className="bg-ink-950 text-cream-100">
      <Container className="py-12">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-[1.5fr_1fr_1fr]">
          <div className="space-y-4">
            <Brand tone="light" />
            <p className="max-w-xs text-sm leading-relaxed text-cream-100/65">
              {APP.tagline}
            </p>
            <div className="flex gap-2">
              <a
                href={APP.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Bachelor's Street on Instagram"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-cream-100 transition-colors hover:border-flame-400 hover:text-flame-400"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href={APP.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Bachelor's Street on Facebook"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-cream-100 transition-colors hover:border-flame-400 hover:text-flame-400"
              >
                <Facebook className="h-4 w-4" />
              </a>
            </div>
          </div>

          <nav aria-label="Shop">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-flame-400">
              Shop
            </p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/menu" className="text-cream-100/75 transition-colors hover:text-cream-50">
                  Menu
                </Link>
              </li>
              <li>
                <Link href="/#deals" className="text-cream-100/75 transition-colors hover:text-cream-50">
                  Deals
                </Link>
              </li>
              <li>
                <Link href="/track" className="text-cream-100/75 transition-colors hover:text-cream-50">
                  Track order
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Support">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-flame-400">
              Help
            </p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/contact" className="text-cream-100/75 transition-colors hover:text-cream-50">
                  Contact
                </Link>
              </li>
              <li>
                <a
                  href={APP.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-cream-100/75 transition-colors hover:text-cream-50"
                >
                  <MapPin className="h-3.5 w-4" aria-hidden />
                  Get directions
                </a>
              </li>
              <li>
                <Link href="/terms" className="text-cream-100/75 transition-colors hover:text-cream-50">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-cream-100/75 transition-colors hover:text-cream-50">
                  Privacy
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-cream-100/50 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {APP.name} · {APP.area}
          </p>
          <p>Demo storefront — sample menu and offers.</p>
        </div>
      </Container>
    </footer>
  );
}

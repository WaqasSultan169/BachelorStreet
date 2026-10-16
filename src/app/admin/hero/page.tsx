import type { Metadata } from "next";
import { requireRole } from "@/server/middleware/require-auth";
import { listHeroSlides } from "@/server/services/heroSlide.service";
import { HeroAdminClient } from "@/app/admin/hero/hero-admin-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hero slider",
  description: "Manage homepage campaign posters.",
};

export default async function AdminHeroPage() {
  await requireRole(["admin"]);
  const slides = await listHeroSlides();
  return <HeroAdminClient initialSlides={slides} />;
}

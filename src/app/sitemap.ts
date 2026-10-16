import type { MetadataRoute } from "next";

const PUBLIC_ROUTES = [
  "/",
  "/menu",
  "/contact",
  "/about",
  "/track",
  "/terms",
  "/privacy",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    "http://localhost:3000";

  const now = new Date();

  return PUBLIC_ROUTES.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "/" ? "daily" : "weekly",
    priority: route === "/" ? 1 : route === "/menu" ? 0.9 : 0.7,
  }));
}
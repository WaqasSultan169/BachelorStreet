import type { NextConfig } from "next";

// On memory-constrained machines the default build worker count (one per CPU)
// can exhaust RAM and crash "Collecting page data". Set NEXT_BUILD_CPUS to
// constrain workers for a local build without affecting other environments.
const buildCpus = process.env.NEXT_BUILD_CPUS
  ? Number(process.env.NEXT_BUILD_CPUS)
  : undefined;

const nextConfig: NextConfig = {
  // Cache Components / PPR are intentionally left disabled for now. The app is
  // heavily dynamic (session, cart, catalog); dynamic pages stay safe with the
  // default model until we deliberately adopt the cache-components model.
  serverExternalPackages: ["mongoose", "@node-rs/argon2"],
  images: {
    // Product photography may be served from an external host. Images are
    // always optimized; only remote sources are matched here.
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "source.unsplash.com" },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  ...(buildCpus ? { experimental: { cpus: buildCpus } } : {}),
};

export default nextConfig;

"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { resolveImageUrl } from "@/lib/cloudinary";
import { LogoMark } from "@/components/layout/logo";

type ProductImageProps = {
  src?: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  iconClassName?: string;
  width?: number;
  height?: number;
};

export function ProductImage({
  src,
  alt,
  sizes = "(max-width: 640px) 100vw, 33vw",
  priority,
  className,
  iconClassName,
  width,
  height,
}: ProductImageProps) {
  const resolved = resolveImageUrl(src, { width, height, crop: "fill" });
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = failedSrc === resolved;

  const Fallback = (
    <div
      aria-label={alt}
      role="img"
      className={cn(
        "absolute inset-0 flex items-center justify-center bg-linear-to-br from-cream-100 via-cream-200 to-gold-200/60",
        className,
      )}
    >
      <LogoMark className={cn("h-12 w-12 shadow-none", iconClassName)} />
    </div>
  );

  if (!resolved || failed) {
    return Fallback;
  }

  return (
    <Image
      src={resolved}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={cn("object-cover", className)}
      onError={() => setFailedSrc(resolved ?? null)}
    />
  );
}
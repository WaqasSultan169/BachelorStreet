import type { Metadata } from "next";
import { Archivo, Manrope } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/layout/site-header";
import { Footer } from "@/components/layout/footer";
import { SiteChrome } from "@/components/layout/site-chrome";
import { StoreProvider } from "@/store/provider";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
});

// ✅ Safe URL helper function
function getBaseUrl(): URL {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  
  if (envUrl) {
    try {
      // Agar https:// na laga ho toh auto-add kar do
      const formattedUrl = envUrl.startsWith("http") ? envUrl : `https://${envUrl}`;
      return new URL(formattedUrl);
    } catch {
      // Catch error agar URL bilkul invalid ho
    }
  }

  // Vercel deployment URL ya Fallback Localhost
  if (process.env.VERCEL_URL) {
    return new URL(`https://${process.env.VERCEL_URL}`);
  }

  return new URL("http://localhost:3000");
}

export const metadata: Metadata = {
  title: {
    default: "Bachelor's Street | Fast Food & Online Ordering",
    template: "%s | Bachelor's Street",
  },
  metadataBase: getBaseUrl(), // ✅ Fixed safe URL call
  description:
    "Explore burgers, crispy chicken, fries, pizza and meal deals at Bachelor's Street in H-13, Islamabad. Choose pickup or delivery and order your favourites.",
  keywords: [
    "restaurant",
    "Islamabad",
    "burger",
    "wings",
    "café",
    "delivery",
    "online order",
  ],
  openGraph: {
    title: "Bachelor's Street | Fast Food & Online Ordering",
    description:
      "Explore burgers, crispy chicken, fries, pizza and meal deals at Bachelor's Street in H-13, Islamabad. Choose pickup or delivery and order your favourites.",
    type: "website",
    locale: "en_US",
    siteName: "Bachelor's Street",
    images: [{ url: "/images/food/hero-burger.jpg", alt: "Bachelor's Street burger" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bachelor's Street | Fast Food & Online Ordering",
    description:
      "Explore burgers, crispy chicken, fries, pizza and meal deals at Bachelor's Street in H-13, Islamabad. Choose pickup or delivery and order your favourites.",
  },
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${manrope.variable} ${archivo.variable}`}
    >
      <body className="flex min-h-dvh flex-col" suppressHydrationWarning>
        <StoreProvider>
          <SiteChrome header={<SiteHeader />} footer={<Footer />}>
            {children}
          </SiteChrome>
        </StoreProvider>
      </body>
    </html>
  );
}
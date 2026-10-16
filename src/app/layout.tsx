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

/**
 * Display face: a heavy grotesque that reads as confident fast-food branding
 * rather than a café serif. Used for headlines, prices and the wordmark.
 */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Bachelor's Street | Fast Food & Online Ordering",
    template: "%s | Bachelor's Street",
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "http://localhost:3000"),
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